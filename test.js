import fetch from "node-fetch";
import Datastore from "nedb";

const db = new Datastore("database.db");
db.loadDatabase();

async function getProducts() {
  const url = `https://tienda.mercadona.es/api/categories/115`;
  const res = await fetch(url);
  const data = await res.json();
  const categories = data.categories;
  categories.forEach((cat) => {
    const products = cat.products;
    products.forEach((product) => {
      let prod = new Object();
      prod._id = product.id;
      prod.name = product.display_name;
      prod.prices = [];
      let price = {
        timestamp: Date.now(),
        price: product.price_instructions.unit_price,
      };
      prod.prices.push(price);
      console.log(prod);
    });
  });
}
getProducts();
