FROM node:12-alpine

WORKDIR /server

COPY . .

RUN yarn install --production

EXPOSE 80

CMD [ "npm", "start" ]