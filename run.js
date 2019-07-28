const express = require('express');
const open = require('open');
const defaultBrowser = require('x-default-browser');
const path = require('path');
const { outDir } = require('./utils');
const app = express();
app.use(express.static(`${outDir}`));

function runCommand(){
  app.get('/',function(req,res){
    res.sendFile('/index.html');
  });

  app.listen(3000);

  defaultBrowser(function (err, res) {
      if(err) throw err;
      (async () => {
          await open('http://localhost:3000', {app: res.commonName});
          console.log("ctrl + c to exit");
      })();
  });
}

module.exports = {
  runCommand
};
