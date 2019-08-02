const {getConfig} = require('./utils');
const {populateCSS} = require('./build');
const {updateHTML} = require('./populate');

async function updateCommand() {
    const data = await getConfig();
    await populateCSS(data[0]);
    var username = data[0].username;
    if(username == null){
        console.log("username not found in config.json, please run build command before using update");
        return;
    }
    updateHTML(username, data[0]);
}

module.exports = {
    updateCommand
};
