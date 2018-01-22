# docker-witness
Docker image for dagcoin witness

## Usage

The simplest way to create the docker image and run witness is below.

```console
$ docker build -t witness .
$ docker run -it witness
```

although it is always a good idea to give a container a name you can remember:

```console
$ docker run -it --name my-witness witness
```

Running the container at the first time will set up some configuration items
such as the name of the device so it is important to run the container in an
interactive mode. When finished, release the container by pressing Ctrl-p Ctrl-q.
That will detach the console with leaving the container running.

To stop the container and then restart it again, use:

```console
$ docker stop my-witness
$ docker start -i my-witness
```

Again, the container has to be started in interactive mode because the app asks
for a passphrase.

### Using volumes

Although the witness docker image has been set up to create a volume
and store the byteball runtime files on the host filesystem, using a named volume
is recommended so containers can be dropped and recreated easily by referencing
the existing storage by a simple name:

```console
$ docker volume create --name witness
$ docker run -it --name my-witness -v witness:/dagcoin witness
```

NOTE: The configuration files are stored in the `/dagcoin` folder inside the container. 

### Changing the configuration

In order to change the configuration file, stop the witness container
start a new one like below:

```console
$ docker run -it --rm -v witness:/dagcoin witness vi /dagcoin/conf.json
```

This will mount the named byteball volume and open the conf.json file in the
`vi` text editor. When you quite from `vi` the container will automatically
delete itself due to the `--rm` flag.

Now you can start the container again and the app will start up with the 
changed configuration.

A sample configuration:

```
{
        "deviceName": "witness",
        "admin_email": "admin@example.com",
        "from_email": "fromemail@example.com",
        "permanent_paring_secret": "randomstring",
        "control_addresses": ["DEVICE ALLOWED TO CHAT"],
        "payout_address": "WHERE THE MONEY CAN BE SENT TO"
}
```

See configuration options here:
* [byteball/byteballcore](https://github.com/byteball/byteballcore)
* [witness](./README.md)

### Checking the log file

In case you need to check the log files you can use the following command:

```console
$ docker run -it --rm -v witness:/dagcoin witness less /dagcoin/log.txt
```

### Exposing port to the host system

If you enabled the default websocket port (6611) you may want to map it a port
on your host system. You have to create the container as below, but you may
first want to stop and remove the running container before creating a new one.

```console
$ docker stop my-witness
$ docker rm my-witness
$ docker run -it --name my-witness -v witness:/dagcoin -p 6611:6611 witness
```

This will map the 6611 port of the host system to the 6611 port of the container.
