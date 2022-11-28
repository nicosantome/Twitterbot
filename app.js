import fetch from "node-fetch";
import Datastore from "nedb";

const db = new Datastore("database.db");
db.loadDatabase();

//Getting all categories from Mercadona
// async function getCategories() {
//   const categoriesArr = [];
//   const url = "https://tienda.mercadona.es/api/categories/";
//   const res = await fetch(url);
//   const data = await res.json();
//   const supraCat = data.results;
//   supraCat.forEach((cat) => {
//     const categories = cat.categories;
//     categories.forEach((cat) => categoriesArr.push(cat.id));
//   });
//   return categoriesArr;
// }

// const categoriesId = await getCategories();

let test = [];

//Getting product names & prices

// categoriesId.forEach((id, i) => {
//   setTimeout(() => {
//     getProducts(id);
//     console.log(i);
//   }, i * 3000);
// });

// find id
function idExists() {
  db.find({ _id: product.id }, function () {
    return true;
  });
}

function createNewProduct(product) {
  let prod = new Object();
  prod._id = product.id;
  prod.name = product.display_name;
  prod.prices = [];
  let price = {
    timestamp: Date.now(),
    price: product.price_instructions.unit_price,
  };
  prod.prices.push(price);
  db.insert(prod);
  console.log(prod);
}

async function getProducts(id) {
  const url = `https://tienda.mercadona.es/api/categories/${id}`;
  const res = await fetch(url);
  const data = await res.json();
  const categories = data.categories;
  categories.forEach((cat) => {
    const products = cat.products;
    products.forEach((product) => {
      if (!idExists) createNewProduct(product);
      else {
        // comparePices()
      }
    });
  });
}

getProducts(115);
