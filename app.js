import fetch from "node-fetch";
import Datastore from "nedb";
import Twit from "twit";
import * as dotenv from "dotenv";
import { Agent } from "https";

dotenv.config();

//This first DB saves all products from the web store
const db = new Datastore("database.db");
db.loadDatabase();

//This second DB saves only the products which price has just been updated
const dailyUpdate = new Datastore("dailyUpdate.db");
dailyUpdate.loadDatabase();

// Twitter library
const T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

//This next 3 secondary functions are for the main getProducts function work later
//Function checks if a product already exists in the database. If it does, it returns the product and if not it returns false.
function idExists(id) {
  return new Promise((resolve, reject) => {
    db.find({ _id: id }, function (err, docs) {
      if (err) return reject(err);
      resolve(docs[0] ?? false);
    });
  });
}

//Function checks if there was a price change (compares fetched price with DB price)
function priceChange(fetchedProd, dbProd) {
  if (
    fetchedProd.price_instructions.unit_price ==
    dbProd.prices[dbProd.prices.length - 1].price
  ) {
    return;
  } else {
    let price = {
      timestamp: Date.now(),
      price: fetchedProd.price_instructions.unit_price,
    };
    return price;
  }
}

//Function to create an object with the new product info & insert it in the database
function createNewProduct(product) {
  let prod = new Object();
  prod._id = product.id;
  prod.name = product.display_name;
  // prod.img = product.thumbnail;
  prod.prices = [];
  let price = {
    timestamp: Date.now(),
    price: product.price_instructions.unit_price,
  };
  prod.prices.push(price);
  db.insert(prod);
}

//Function that takes a string as an argument and posts it in Twitter
function post(str) {
  T.post("statuses/update", { status: str }, function (err, data, response) {
    if (err) console.error(err);
    else console.log(response.statusCode, response.statusMessage);
  });
}

//********* Product fetch + DBs maintainance *********

// Getting all product categories from Mercadona
async function getCategories() {
  const categoriesArr = [];
  const url = "https://tienda.mercadona.es/api/categories/";
  const res = await fetch(url);
  const data = await res.json();
  const supraCat = data.results;
  supraCat.forEach((cat) => {
    const categories = cat.categories;
    categories.forEach((cat) => categoriesArr.push(cat.id));
  });
  return categoriesArr;
}

const categoriesId = [115];
//await getCategories();

//Function fetches all products from a specific category (catId) of the supermarket, it creates and updates "db" database with all products and it creates a "dailyUpdate" db with the price variation products that will be tweeted later on.
async function getProducts(catId) {
  const url = `https://tienda.mercadona.es/api/categories/${catId}`;
  const res = await fetch(url, {
    agent: new Agent({
      rejectUnauthorized: false,
    }),
  });
  const data = await res.json();
  //Products are nested 2 levels deep in the response, therefore 2 forEach
  const categories = data.categories;
  categories.forEach((cat) => {
    const products = cat.products;
    products.forEach(async (product) => {
      //prodOrFalse var checks if fetched product is already in db (returns prod) or if it's not (returns false)
      let prodOrFalse = await idExists(product.id);
      if (!prodOrFalse) {
        createNewProduct(product);
      } else {
        //If product exists and price has changed, + timestamp + price are added in DB prices array
        let newPrice = priceChange(product, prodOrFalse);

        if (newPrice) {
          let newPriceId = product.id;
          db.update({ _id: product.id }, { $push: { prices: newPrice } });
          dailyUpdate.insert({ newPriceId });
          db.persistence.compactDatafile();
        }
      }
    });
  });
}

// ********** TwitterBot functionality **********

// Function creates a string with the price increase or decrease of each product on dailyUpdate DB and posts the string to tweeter
function createPost(id) {
  //Compares last price and previous price and inform if "Increase" or "Decrease", how much and the percentage of the change
  db.find({ _id: id }, function (err, docs) {
    let lastPrice = docs[0].prices[docs[0].prices.length - 1].price;
    let prevPrice = docs[0].prices[docs[0].prices.length - 2].price;
    let update = lastPrice > prevPrice ? "Aumento" : "Bajada";

    let diferencia =
      update == "Aumento"
        ? (lastPrice - prevPrice) / prevPrice
        : (prevPrice - lastPrice) / prevPrice;
    let str = `
      ${docs[0].name}\n
      ${update} de precio\n
      Antes: €${docs[0].prices[docs[0].prices.length - 2].price}\n
      Ahora: €${docs[0].prices[docs[0].prices.length - 1].price}\n
      ${update == "Aumento" ? "🔺" : "🔻"} ${(diferencia * 100).toFixed()}%
      `;

    //This below post the string created
    post(str);
  });
}

function product() {
  return new Promise((resolve, reject) => {
    categoriesId.forEach((id, i) => {
      setTimeout(() => {
        getProducts(id);
      }, i * 4000);
    });
    setTimeout(resolve, categoriesId.length * 4000);
  });
}

function tweet() {
  return new Promise((resolve, reject) => {
    dailyUpdate.find({}, function (err, docs) {
      docs.forEach((doc, i) => {
        setTimeout(() => {
          // The timeout is as per Twitter permited posts per minute
          createPost(doc.newPriceId);
        }, i * 10000);
      });
      dailyUpdate.remove({}, { multi: true });
      dailyUpdate.persistence.compactDatafile();
      resolve();
    });
  });
}

product().then(tweet);
