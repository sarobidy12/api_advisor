# Menu advisor backend (ExpressJS)

## Setup

We are using Yarn as package manager for the project.

- Install all needed dependencies by running

```bash
yarn install
```

If you don't have yarn installed, go get it [here](https://classic.yarnpkg.com/en/docs/install/)

- Create **.env** config file by following the example given in _.env.example_ file

```bash
cp .env.example .env
```

## Running development server

To run development server, just

```bash
yarn dev
```

OR

```bash
yarn run dev
```

## Running production server

To run server in production mode, first set the NODE_ENV environment variable to 'production' for optimization, then run

```bash
yarn start
```
