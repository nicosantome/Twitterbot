import fetch from "node-fetch";
import Datastore from "nedb";

const db = new Datastore("database.db");
const dailyUpdate = new Datastore("dailyUpdate.db");

db.loadDatabase();
dailyUpdate.loadDatabase();

let todaysIds = [];

// Getting all categories from Mercadona
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

const categoriesId = await getCategories();

// Getting product names & prices
categoriesId.forEach((id, i) => {
  setTimeout(() => {
    getProducts(id);
    console.log(i);
  }, i * 3000);
});

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

//Function fetches all products from a specific category (example used when calling the fn: 115)
async function getProducts(catId) {
  const url = `https://tienda.mercadona.es/api/categories/${catId}`;
  const res = await fetch(url);
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
        }
      }
    });
  });
}
