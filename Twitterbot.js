import Twit from "twit";
import Datastore from "nedb";

const dailyUpdate = new Datastore("dailyUpdate.db");
const db = new Datastore("database.db");
dailyUpdate.loadDatabase();
db.loadDatabase();

const T = new Twit({
  consumer_key: "zBvUi9GyGh6Ggp1QYYnTifrs4",
  consumer_secret: "EMFrJMWilJZ4fxrG7yKjgUySIEtfrgXaWtqTaJiTPBd2SIztQH",
  access_token: "1600579008839696417-izfg1tLMgopTKThbJf92zSUYywbvhQ",
  access_token_secret: "aapLmnDezZEvrIOF3TZHLBkC450NszgK4N3NoZtMy4pqu",
  // timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
  // strictSSL: true, // optional - requires SSL certificates to be valid.
});

// //For each Id on todaysIds array, create an object, prod name, image?, increase/decrease, previous price, current price * graph?
function createStrPost(id) {
  db.find({ _id: id }, function (err, docs) {
    let precioUlt = docs[0].prices[docs[0].prices.length - 1].price;
    let precioPen = docs[0].prices[docs[0].prices.length - 2].price;
    let update = precioUlt > precioPen ? "Aumento" : "Bajada";

    let diferencia =
      update == "Aumento"
        ? (precioUlt - precioPen) / precioPen
        : (precioPen - precioUlt) / precioPen;
    let str = `
      ${docs[0].name}\n
      ${update} de precio\n
      Antes: €${docs[0].prices[docs[0].prices.length - 2].price}\n
      Ahora: €${docs[0].prices[docs[0].prices.length - 1].price}\n
      ${update == "Aumento" ? "🔺" : "🔻"} ${(diferencia * 100).toFixed()}%
      `;

    T.post(
      "statuses/update",
      { status: str },
      function (err, data, response) {}
    );
  });
}

let todaysIds = [];

dailyUpdate.find({}, function (err, docs) {
  docs.forEach((doc) => {
    todaysIds.push(doc.newPriceId);
  });
  todaysIds.forEach((id, i) => {
    setTimeout(() => {
      createStrPost(id);
    }, i * 10000);
  });
});
