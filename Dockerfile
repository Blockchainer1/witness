FROM node:7.4-alpine

COPY	. /home/dagcoin/
WORKDIR /home/dagcoin


RUN	deluser --remove-home node
RUN adduser -D -u 1000 dagcoin
RUN apk add --no-cache --virtual .build-deps git
RUN npm install
RUN sh /home/dagcoin/testnetify.sh
RUN apk del .build-deps
RUN mkdir /dagcoin /home/dagcoin/.config
RUN chown dagcoin:dagcoin /dagcoin /home/dagcoin/.config
RUN ln -s /dagcoin /home/dagcoin/.config/witness

VOLUME /dagcoin
USER   dagcoin


EXPOSE 6611

#CMD [ "/bin/sh"]
CMD [ "/bin/sh", "-c", "node start.js 2>> /dagcoin/error.log" ]
