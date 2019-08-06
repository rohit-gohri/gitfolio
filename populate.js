const fs = require('fs');
const emoji = require('github-emoji');
const _ = require('lodash');
const jsdom = require('jsdom').JSDOM,
    options = {
        resources: "usable"
    };
const { getConfig, outDir } = require('./utils');
const { getRepos, getUser } = require('./api');

function convertToEmoji(text) {
    if (text == null) return;
    text = text.toString();
    var pattern = /(?<=:\s*).*?(?=\s*:)/gs
    if (text.match(pattern) != null) {
        var str = text.match(pattern);
        str = str.filter(function (arr) {
            return /\S/.test(arr);
        });
        for (i = 0; i < str.length; i++) {
            if (emoji.URLS[str[i]] != undefined) {
                var output = emoji.of(str[i]);
                var emojiImage = output.url.replace("assets-cdn.github", "github.githubassets");
                text = text.replace(`:${str[i]}:`, `<img src="${emojiImage}" class="emoji">`);
            }
        }
        return text;
    } else {
        return text;
    }
}

async function addRepoDetails(document, username, opts) {
    const repos = await getRepos(username, opts)

    for (var i = 0; i < repos.length; i++) {
        let element;
        if(repos[i].fork == false){
            element = document.getElementById("work_section")
            
        }else if(opts.includeFork == true){
            document.getElementById("forks").style.display = "block";
            element = document.getElementById("forks_section");
        }else {
            continue;
        }
        element.innerHTML += `
            <a href="${repos[i].html_url}" target="_blank">
            <section>
                <div class="section_title">${repos[i].name}</div>
                <div class="about_section">
                <span style="display:${repos[i].description == undefined ? 'none' : 'block'};">${convertToEmoji(repos[i].description)}</span>
                </div>
                <div class="bottom_section">
                    <span style="display:${repos[i].language == null ? 'none' : 'inline-block'};"><i class="fas fa-code"></i>&nbsp; ${repos[i].language}</span>
                    <span><i class="fas fa-star"></i>&nbsp; ${repos[i].stargazers_count}</span>
                    <span><i class="fas fa-code-branch"></i>&nbsp; ${repos[i].forks_count}</span>
                </div>
            </section>
            </a>`;
    }
}

function addMetaTags(document, user, config = {}) {    
    const nameArr = (user.name && user.name.split(' ').filter(Boolean)) || [];
    const data = {
        nameAndUsername: `${user.name} (@${user.login})`,
        firstName: nameArr[0],
        lastName: nameArr[nameArr.length - 1],
        image: config.socialPreviewImg || user.avatar_url,
    };
    const metaTags = {
        description: user.bio,
        'og:title':  data.nameAndUsername,
        'og:image': data.image,
        'og:description': user.bio,
        'og:type': 'profile',
        'profile:first_name': data.firstName,
        'profile:last_name': data.lastName,
        'profile:username': user.login,
    };
    
    const head = document.getElementsByTagName("head")[0];
    document.title = data.nameAndUsername;
    const icon = document.createElement("link");
    icon.setAttribute("rel", "icon");
    icon.setAttribute("href", user.avatar_url);
    icon.setAttribute("type", "image/png");
    head.appendChild(icon);

    Object.keys(metaTags).forEach((property) => {
        const el = document.createElement("meta");
        el.setAttribute('type', property);
        const content = metaTags[property];
        if (!content) return;
        el.setAttribute('content', content);
        head.appendChild(el);
    })
}

module.exports.updateHTML = (username, opts) => {
    const {twitter, linkedin, medium} = opts;
    //add data to assets/index.html
    jsdom.fromFile(`${__dirname}/assets/index.html`, options).then(function (dom) {
        let window = dom.window, document = window.document;
        (async () => {
            try {
                console.log("Building HTML/CSS...");
                const data = await getConfig();
                await addRepoDetails(document, username, opts);
                const user = await getUser(username);
                addMetaTags(document, user, data[0]);

                document.getElementById("profile_img").style.background = `url('${user.avatar_url}') center center`
                document.getElementById("username").innerHTML = `<span style="display:${user.name == null || !user.name ? 'none' : 'block'};">${user.name}</span><a href="${user.html_url}">@${user.login}</a>`;
                //document.getElementById("github_link").href = `https://github.com/${user.login}`;
                document.getElementById("userbio").innerHTML = convertToEmoji(user.bio);
                document.getElementById("userbio").style.display = user.bio == null || !user.bio ? 'none' : 'block';


                let about = `
                <span style="display:${user.company == null || !user.company ? 'none' : 'block'};"><i class="fas fa-users"></i> &nbsp; ${user.company}</span>
                <span style="display:${user.email == null || !user.email ? 'none' : 'block'};"><i class="fas fa-envelope"></i> &nbsp; ${user.email}</span>
                <span style="display:${user.blog == null || !user.blog ? 'none' : 'block'};"><i class="fas fa-link"></i> &nbsp; <a href="${user.blog}">${user.blog}</a></span>
                <span style="display:${twitter == null ? 'none' : 'block'};"><i class="fab fa-twitter-square"></i> &nbsp;&nbsp; <a href="https://www.twitter.com/${twitter}" target="_blank" class="socials"> Twitter</a></span>
                <span style="display:${linkedin == null ? 'none' : 'block'};"><i class="fab fa-linkedin"></i> &nbsp;&nbsp; <a href="https://www.linkedin.com/in/${linkedin}/" target="_blank" class="socials"> LinkedIn</a></span>
                <span style="display:${medium == null ? 'none' : 'block'};"><i class="fab fa-medium"></i> &nbsp;&nbsp; <a href="https://www.medium.com/@${medium}/" target="_blank" class="socials"> Medium</a></span>
                <span style="display:${user.location == null || !user.location ? 'none' : 'block'};"><i class="fas fa-map-marker-alt"></i> &nbsp;&nbsp; ${user.location}</span>`;

                about += `<span style="display:${user.hireable == false || !user.hireable ? 'none' : 'block'};">
                    <i class="fas fa-user-tie"></i>
                        &nbsp;&nbsp;
                        ${data[0].hireLink ? `<a href="${data[0].hireLink}" target="_blank">` : ''}
                        Available for hire
                        ${data[0].hireLink ? `</a>` : ''}
                    </span>`;

                document.getElementById("about").innerHTML = about;

                //add data to config.json
                data[0].username = user.login;
                data[0].name = user.name;
                data[0].userimg = user.avatar_url;
                
                await fs.writeFile(`${outDir}/config.json`, JSON.stringify(data, null, ' '), function (err) {
                    if (err) throw err;
                    console.log("Config file updated.");
                });
                await fs.writeFile(`${outDir}/index.html`, '<!DOCTYPE html>' + window.document.documentElement.outerHTML, function (error) {
                    if (error) throw error;
                    console.log(`Build Complete, Files can be Found @ ${outDir}`);
                });
            } catch (error) {
                console.log(error);
            }
        })();
    }).catch(function (error) {
        console.log(error);
    });
}
