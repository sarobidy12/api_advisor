const express = require('express');
const router = express.Router();
const moment = require('moment');

const {
  UNAUTHORIZED,
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  OK,
  NOT_FOUND,
  NOT_ACCEPTABLE,
} = require('http-status-codes');

const { tokenAuthenticator } = require('../middlewares/token');

const Command = require('../models/Command.model');
const Food = require('../models/Food.model');

router.get('/', tokenAuthenticator, async function (req, res, next) {
  try {
    //@GETTING COMMAND'S NUMBER
    //@DESK Get current day
    let currentDate = moment().format('YYYY-MM-DD');

    //@DESK Get current wek
    let weekOf = moment().isoWeek();

    let formatDay = [];
    let formatWeek = [];
    let formatMonth = [];
    let formatYear = [];

    // console.log(req.user);
    const comande = await Command.find().populate('restaurant');
    // console.log(comande);
    // let tab = [];
    // console.log('REQ USER.....>>>>>>', req.user);
    // if (req.user.roles.includes('ROLE_ADMIN')) {
    //   tab = comande;
    // } else {
    //   tab = comande.filter(
    //     (item) => item.restaurant.admin.toString() == req.user.id.toString(),
    //   );
    // }

    // console.log('RESTAURANT ID ICI', comande.restaurant.admin);
    for (let i = 0; i < comande.length; i++) {
      formatDay.push(moment(comande[i].createdAt).format('YYYY-MM-DD'));
      formatWeek.push(moment(comande[i].createdAt).isoWeek());
      formatMonth.push(moment(comande[i].createdAt).format('MM'));
      formatYear.push(moment(comande[i].createdAt).format('YYYY'));
    }

    //@ get day
    let dash_day = formatDay.filter((day) => day === currentDate);
    let daySplit = currentDate.split('-')[1];

    //@ get week
    let dash_week = formatWeek.filter((week) => week === weekOf);

    //get month
    let dash_month = formatMonth.filter((month) => month === daySplit);

    //@ get year
    let daySplit2 = currentDate.split('-')[0];
    let dash_year = formatYear.filter((year) => year === daySplit2);

    //@DESK GETTING CHIFFRE D'AFFAIRE
    //@DESK get chiffre d'affaire d'aujourd'hui
    let filter_day = comande.filter(
      (item) => moment(item.createdAt).format('YYYY-MM-DD') === currentDate,
    );

    let ca_day = filter_day.reduce((acc, v) => (acc += v.totalPrice), 0);

    //@DESK get chiffre d'affaire de cette semaine
    let filter_week = comande.filter(
      (item) => moment(item.createdAt).isoWeek() === weekOf,
    );

    let ca_week = filter_week.reduce((acc, v) => (acc += v.totalPrice), 0);

    //@DESK get chiffre d'affaire du mois
    let filter_month = comande.filter(
      (item) =>
        moment(item.createdAt).format('MM') == currentDate.split('-')[1],
    );
    // console.log('ICI COMMENCE LE MOIS', filter_month);
    let ca_month = filter_month.reduce((acc, v) => (acc += v.totalPrice), 0);

    //@DESK get Chiffre d'affaire par an
    let filter_year = comande.filter(
      (item) =>
        moment(item.createdAt).format('YYYY') == currentDate.split('-')[0],
    );
    let ca_year = filter_year.reduce((acc, v) => (acc += v.totalPrice), 0);

    //@DESK GETTING MEILLEUR RESTO
    let objDay = {};
    let objWeek = {};
    let objMonth = {};
    let objYear = {};

    //@FOR stocking price
    let somDay = [];
    let somWeek = [];
    let somMonth = [];
    let somYear = [];

    // //@ get meilleur resto par jour
    let bestRestoDay = filter_day.map((item) => ({
      restaurant: item.restaurant.name,
      price: item.totalPrice,
    }));
    // console.log('BEST RESTO DAY HEREE>>>>', bestRestoDay);

    for (let [cle, value] of Object.entries(bestRestoDay)) {
      if (objDay.hasOwnProperty(value.restaurant)) {
        objDay[value.restaurant]++;
      } else {
        objDay[value.restaurant] = 1;
      }
    }
    // console.log('OBJET DAY HERE....>>>>', objDay);
    for (let [key, v] of Object.entries(objDay)) {
      somDay.push(v);
    }
    // console.log(somDay);
    let max = Math.max(...somDay);

    let resto_du_jour = Object.entries(objDay)
      .filter(([cle, value]) => value === max)
      .map(([cle, value]) => ({
        resto: cle,
        nombre_commande: value,
      }));
    //@ get total price today
    let filtrePriceDay = bestRestoDay
      .filter((v) => v.restaurant == resto_du_jour[0].resto)
      .reduce((acc, v) => (acc += v.price), 0);

    let restoDay = [...resto_du_jour, { price: filtrePriceDay }];

    // //@DESK get meilleur resto du semaine
    let bestRestoWeek = filter_week.map((item) => ({
      restaurant: item.restaurant.name,
      price: item.totalPrice,
    }));

    for (let [cle, value] of Object.entries(bestRestoWeek)) {
      if (objWeek.hasOwnProperty(value.restaurant)) {
        objWeek[value.restaurant]++;
      } else {
        objWeek[value.restaurant] = 1;
      }
    }

    for (let [key, v] of Object.entries(objWeek)) {
      somWeek.push(v);
    }
    // console.log(somDay);
    let maxWeek = Math.max(...somWeek);

    let resto_du_semaine = Object.entries(objWeek)
      .filter(([cle, value]) => value === maxWeek)
      .map(([cle, value]) => ({
        resto: cle,
        nombre_commande: value,
      }));
    //@ get total price week
    let filtrePriceWeek = bestRestoWeek
      .filter((v) => v.restaurant == resto_du_semaine[0].resto)
      .reduce((acc, v) => (acc += v.price), 0);

    let restoWeek = [...resto_du_semaine, { price: filtrePriceWeek }];

    //@DESK get meilleur resto par mois
    let bestRestoMonth = filter_month.map((item) => ({
      restaurant: item.restaurant.name,
      price: item.totalPrice,
    }));

    for (let [cle, value] of Object.entries(bestRestoMonth)) {
      if (objMonth.hasOwnProperty(value.restaurant)) {
        objMonth[value.restaurant]++;
      } else {
        objMonth[value.restaurant] = 1;
      }
    }

    for (let [key, v] of Object.entries(objMonth)) {
      somMonth.push(v);
    }
    let maxMonth = Math.max(...somMonth);

    let resto_du_mois = Object.entries(objMonth)
      .filter(([cle, value]) => value === maxMonth)
      .map(([cle, value]) => ({
        resto: cle,
        nombre_commande: value,
      }));

    let filtrePriceMonth = bestRestoMonth
      .filter((v) => v.restaurant == resto_du_mois[0].resto)
      .reduce((acc, v) => (acc += v.price), 0);
    let restoMonth = [...resto_du_mois, { price: filtrePriceMonth }];

    //@DESK get meilleur resto de l'an
    let bestRestoYear = filter_year.map((item) => ({
      restaurant: item.restaurant.name,
      price: item.totalPrice,
    }));

    for (let [cle, value] of Object.entries(bestRestoYear)) {
      if (objYear.hasOwnProperty(value.restaurant)) {
        objYear[value.restaurant]++;
      } else {
        objYear[value.restaurant] = 1;
      }
    }

    for (let [key, v] of Object.entries(objYear)) {
      somYear.push(v);
    }

    let maxYear = Math.max(...somYear);

    let resto_an = Object.entries(objYear)
      .filter(([cle, value]) => value === maxYear)
      .map(([cle, value]) => ({
        resto: cle,
        nombre_commande: value,
      }));

    let filtrePriceYear = bestRestoMonth
      .filter((v) => v.restaurant == resto_an[0].resto)
      .reduce((acc, v) => (acc += v.price), 0);
    // let restoYear = Object.assign({ price: filtrePriceYear }, resto_an);
    // resto_an['price'] = filtrePriceYear;
    let restoYear = [...resto_an, { price: filtrePriceYear }];

    return res.status(OK).json({
      dashboard_day: dash_day.length,
      dashboard_week: dash_week.length,
      dashboard_month: dash_month.length,
      dashboard_year: dash_year.length,
      chiffre_affaire_day: ca_day,
      chiffre_affaire_week: ca_week,
      chiffre_affaire_month: ca_month,
      chiffre_affaire_year: ca_year,
      best_resto_day: restoDay,
      best_resto_week: restoWeek,
      best_resto_month: restoMonth,
      best_resto_year: restoYear,
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
