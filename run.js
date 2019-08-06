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
      if(err) {
        console.error('Could not find default browser:', err);
      }
      (async () => {
        if(!err && res.commonName) {
          await open('http://localhost:3000', {app: res.commonName});
        }
        else {
          console.log('Server listening on http://localhost:3000');
        }
        console.log("ctrl + c to exit");
      })();
  });
}

module.exports = {
  runCommand
};
