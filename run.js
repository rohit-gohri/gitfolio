const express = require("express");
const path = require("path");
const { outDir } = require("./utils");
const app = express();
app.use(express.static(`${outDir}`));

function runCommand(program) {
  let port = program.port ? program.port : 3000;

  app.get("/", function(req, res) {
    res.sendFile("/index.html");
  });

  app.listen(port);
  console.log(
    `\nGitfolio running on port ${port}, Navigate to http://localhost:${port} in your browser\n`
  );
}

module.exports = {
  runCommand
};
