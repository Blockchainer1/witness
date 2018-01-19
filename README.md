# Witness node in Dagcoin network

This is an example of witness node for Dagcoin network.  It periodically posts transactions from the same address.

Running this code is not the only way to run a witness.  If some other (more useful) activity implies frequent posting from a constant address, this address can become a witness address.  For example, if you are an oracle and already post frequently enough, then you can become a witness as well.   The code in this module is a "naked" witness, which just periodically posts transactions that move money to itself.

## Install

Install node.js, clone the repository, then say
```sh
npm install
```
Enabling TOR is highly recommended in order to keep your IP address unknown to potential attackers.  See [byteballcore]() documentation.

## Run
```sh
node start.js
```
Witness node is based on headless node, see its [documentation about running and configuring a headless node]().
