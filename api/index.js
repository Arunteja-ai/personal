const app = require("../server");
const { initDb } = require("../db/database");

let ready;

module.exports = async (req, res) => {
  if (!ready) {
    ready = initDb();
  }

  await ready;
  return app(req, res);
};
