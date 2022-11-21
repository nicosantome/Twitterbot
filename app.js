import fetch from "node-fetch";
import Datastore from "nedb";

const database = new Datastore("database.db");
database.loadDatabase();

//Getting all categories from Mercadona
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

let test = [];
let notUnitPrice = [];

//Getting product names & prices

categoriesId.forEach((id, i) => {
  setTimeout(() => {
    getProducts(id);
    console.log(i);
  }, i * 3000);
});

async function getProducts(id) {
  const url = `https://tienda.mercadona.es/api/categories/${id}`;
  const res = await fetch(url);
  const data = await res.json();
  const categories = data.categories;
  categories.forEach((cat) => {
    const products = cat.products;
    products.forEach((product) => {
      let prod = new Object();
      prod.id = product.id;
      prod.name = product.display_name;
      prod.price = product.price_instructions.unit_price;
      test.push(prod);
      database.insert(prod);
    });
  });

  test.sort((a, b) => a.id - b.id);
}
