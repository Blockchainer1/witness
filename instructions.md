```sh
$ docker-machine rm default

$ docker-machine create --driver virtualbox default

$ docker-machine restart default      # Restart the environment
$ eval $(docker-machine env default)  # Refresh your environment settings

$ docker build -t byteball-witness - < byteball-witness.dockerfile
$ docker run -it --name my-byteball-witness byteball-witness

$ docker stop my-byteball-witness
$ docker start my-byteball-witness

$ docker volume create --name byteball-witness
$ docker run -d --name my-byteball-witness -v byteball-witness:/byteball byteball-witness

$ docker exec -it my-byteball-witness /bin/sh 
$ docker exec -ti -u root my-byteball-witness /bin/sh # for root mode to testnetify
```


## Change byteball const.js
```sh
$ cd /usr/local/lib/node_modules/byteball-witness/node_modules/byteballcore
$ vi constants.js
```

## start
```sh
"node /usr/local/lib/node_modules/byteball-witness/start.js 2>> /byteball/error.log"
```

##check logs
```sh
$ cd /home/byteball/.config/byteball-witness
```

## list active containers 
```sh
$ docker container ls
```

## delete container
```sh
$ docker rm my-byteball-witness
```