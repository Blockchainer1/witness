/* jslint node: true */

'use strict';

const conf = require('core/conf.js');
const db = require('core/db.js');
const storage = require('core/storage.js');
const eventBus = require('core/event_bus.js');
const mail = require('core/mail.js');
const headlessWallet = require('headless-wallet');
const desktopApp = require('core/desktop_app.js');
const objectHash = require('core/object_hash.js');

const WITNESSING_COST = 600; // size of typical witnessing unit
let myAddress;
let bWitnessingUnderWay = false;
let forcedWitnessingTimer;
let countWitnessingsAvailable = 0;

if (!conf.bSingleAddress && require.main === module)	{ throw Error('witness must be single address'); }

headlessWallet.setupChatEventHandlers();

function notifyAdmin(subject, body) {
    mail.sendmail({
        to: conf.admin_email,
        from: conf.from_email,
        subject,
        body
    });
}

function notifyAdminAboutFailedWitnessing(err) {
    console.log(`witnessing failed: ${err}`);
    notifyAdmin(`witnessing failed: ${err}`, err);
}

function notifyAdminAboutWitnessingProblem(err) {
    console.log(`witnessing problem: ${err}`);
    notifyAdmin(`witnessing problem: ${err}`, err);
}


function witness(onDone) {
    function onError(err) {
        notifyAdminAboutFailedWitnessing(err);
        setTimeout(onDone, 60000); // pause after error
    }
    const network = require('core/network.js');
    const composer = require('core/composer.js');
    if (!network.isConnected()) {
        console.log('not connected, skipping');
        return onDone();
    }
    createOptimalOutputs((arrOutputs) => {
        const params = {
            paying_addresses: [myAddress],
            outputs: arrOutputs,
            signer: headlessWallet.signer,
            callbacks: composer.getSavingCallbacks({
                ifNotEnoughFunds: onError,
                ifError: onError,
                ifOk(objJoint) {
                    network.broadcastJoint(objJoint);
                    onDone();
                }
            })
        };
        if (conf.bPostTimestamp) {
            const timestamp = Date.now();
            const datafeed = { timestamp };
            const objMessage = {
                app: 'data_feed',
                payload_location: 'inline',
                payload_hash: objectHash.getBase64Hash(datafeed),
                payload: datafeed
            };
            params.messages = [objMessage];
        }
        composer.composeJoint(params);
    });
}

function checkAndWitness() {
    console.log('checkAndWitness');
    clearTimeout(forcedWitnessingTimer);
    if (bWitnessingUnderWay) { return console.log('witnessing under way'); }
    bWitnessingUnderWay = true;
    // abort if there are my units without an mci
    determineIfThereAreMyUnitsWithoutMci((bMyUnitsWithoutMci) => {
        if (bMyUnitsWithoutMci) {
            bWitnessingUnderWay = false;
            return console.log('my units without mci');
        }
        storage.readLastMainChainIndex((max_mci) => {
            const col = (conf.storage === 'mysql') ? 'main_chain_index' : 'unit_authors.rowid';
            db.query(
                `SELECT main_chain_index AS max_my_mci FROM units JOIN unit_authors USING(unit) WHERE +address=? ORDER BY ${col} DESC LIMIT 1`,
                [myAddress],
                (rows) => {
                    const max_my_mci = (rows.length > 0) ? rows[0].max_my_mci : -1000;
                    const distance = max_mci - max_my_mci;
                    console.log(`distance=${distance}`);
                    if (distance > conf.THRESHOLD_DISTANCE) {
                        console.log('distance above threshold, will witness');
                        setTimeout(() => {
                            witness(() => {
                                bWitnessingUnderWay = false;
                            });
                        }, Math.round(Math.random() * 3000));
                    } else {
                        bWitnessingUnderWay = false;
                        checkForUnconfirmedUnits(conf.THRESHOLD_DISTANCE - distance);
                    }
                }
            );
        });
    });
}

function determineIfThereAreMyUnitsWithoutMci(handleResult) {
    db.query('SELECT 1 FROM units JOIN unit_authors USING(unit) WHERE address=? AND main_chain_index IS NULL LIMIT 1', [myAddress], (rows) => {
        handleResult(rows.length > 0);
    });
}

function checkForUnconfirmedUnits(distance_to_threshold) {
    db.query( // look for unstable non-witness-authored units
        "SELECT 1 FROM units CROSS JOIN unit_authors USING(unit) LEFT JOIN my_witnesses USING(address) \n\
        WHERE (main_chain_index>? OR main_chain_index IS NULL AND sequence='good') \n\
            AND my_witnesses.address IS NULL \n\
            AND NOT ( \n\
                (SELECT COUNT(*) FROM messages WHERE messages.unit=units.unit)=1 \n\
                AND (SELECT COUNT(*) FROM unit_authors WHERE unit_authors.unit=units.unit)=1 \n\
                AND (SELECT COUNT(DISTINCT address) FROM outputs WHERE outputs.unit=units.unit)=1 \n\
                AND (SELECT address FROM outputs WHERE outputs.unit=units.unit LIMIT 1)=unit_authors.address \n\
            ) \n\
        LIMIT 1",
        [storage.getMinRetrievableMci()], // light clients see all retrievable as unconfirmed
        (rows) => {
            if (rows.length === 0) { return; }
            const timeout = Math.round((distance_to_threshold + Math.random()) * 10000);
            console.log(`scheduling unconditional witnessing in ${timeout} ms unless a new unit arrives`);
            forcedWitnessingTimer = setTimeout(witnessBeforeThreshold, timeout);
        }
    );
}

function witnessBeforeThreshold() {
    if (bWitnessingUnderWay) { return; }
    bWitnessingUnderWay = true;
    determineIfThereAreMyUnitsWithoutMci((bMyUnitsWithoutMci) => {
        if (bMyUnitsWithoutMci) {
            bWitnessingUnderWay = false;
            return;
        }
        console.log('will witness before threshold');
        witness(() => {
            bWitnessingUnderWay = false;
        });
    });
}

function readNumberOfWitnessingsAvailable(handleNumber) {
    countWitnessingsAvailable--;
    if (countWitnessingsAvailable > conf.MIN_AVAILABLE_WITNESSINGS)		{ return handleNumber(countWitnessingsAvailable); }
    db.query(
        'SELECT COUNT(*) AS count_big_outputs FROM outputs JOIN units USING(unit) \n\
        WHERE address=? AND is_stable=1 AND amount>=? AND asset IS NULL AND is_spent=0',
        [myAddress, WITNESSING_COST],
        (rows) => {
            const count_big_outputs = rows[0].count_big_outputs;
            db.query(
                'SELECT SUM(amount) AS total FROM outputs JOIN units USING(unit) \n\
                WHERE address=? AND is_stable=1 AND amount<? AND asset IS NULL AND is_spent=0 \n\
                UNION \n\
                SELECT SUM(amount) AS total FROM witnessing_outputs \n\
                WHERE address=? AND is_spent=0 \n\
                UNION \n\
                SELECT SUM(amount) AS total FROM headers_commission_outputs \n\
                WHERE address=? AND is_spent=0',
                [myAddress, WITNESSING_COST, myAddress, myAddress],
                (rows) => {
                    const total = rows.reduce((prev, row) => (prev + row.total), 0);
                    const count_witnessings_paid_by_small_outputs_and_commissions = Math.round(total / WITNESSING_COST);
                    countWitnessingsAvailable = count_big_outputs + count_witnessings_paid_by_small_outputs_and_commissions;
                    handleNumber(countWitnessingsAvailable);
                }
            );
        }
    );
}

// make sure we never run out of spendable (stable) outputs. Keep the number above a threshold, and if it drops below, produce more outputs than consume.
function createOptimalOutputs(handleOutputs) {
    const arrOutputs = [{ amount: 0, address: myAddress }];
    readNumberOfWitnessingsAvailable((count) => {
        if (count > conf.MIN_AVAILABLE_WITNESSINGS)			{ return handleOutputs(arrOutputs); }
        // try to split the biggest output in two
        db.query(
            'SELECT amount FROM outputs JOIN units USING(unit) \n\
            WHERE address=? AND is_stable=1 AND amount>=? AND asset IS NULL AND is_spent=0 \n\
            ORDER BY amount DESC LIMIT 1',
            [myAddress, 2 * WITNESSING_COST],
            (rows) => {
                if (rows.length === 0) {
                    notifyAdminAboutWitnessingProblem(`only ${count} spendable outputs left, and can't add more`);
                    return handleOutputs(arrOutputs);
                }
                const amount = rows[0].amount;
                notifyAdminAboutWitnessingProblem(`only ${count} spendable outputs left, will split an output of ${amount}`);
                arrOutputs.push({ amount: Math.round(amount / 2), address: myAddress });
                handleOutputs(arrOutputs);
            }
        );
    });
}


db.query('CREATE UNIQUE INDEX IF NOT EXISTS hcobyAddressSpentMci ON headers_commission_outputs(address, is_spent, main_chain_index)');
db.query('CREATE UNIQUE INDEX IF NOT EXISTS byWitnessAddressSpentMci ON witnessing_outputs(address, is_spent, main_chain_index)');

eventBus.on('headless_wallet_ready', () => {
    if (!conf.admin_email || !conf.from_email) {
        console.log(`please specify admin_email and from_email in your ${desktopApp.getAppDataDir()}/conf.json`);
        process.exit(1);
    }
    const readSingleAddress = conf.bSingleAddress ? headlessWallet.readSingleAddress : headlessWallet.readFirstAddress;
    readSingleAddress((address) => {
        myAddress = address;
        // checkAndWitness();
        eventBus.on('new_joint', checkAndWitness); // new_joint event is not sent while we are catching up
    });
});
