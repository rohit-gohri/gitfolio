const bluebird = require("bluebird");
const fs = bluebird.promisifyAll(require("fs"));
const emoji = require("github-emoji");
const _ = require("lodash");
const jsdom = require("jsdom").JSDOM,
  options = {
    resources: "usable"
  };
const {updateBlogContent} = require('./blog');
const { getBlog, getConfig, updateConfig, outDir } = require("./utils");
const { getRepos, getUser } = require("./api");

function convertToEmoji(text) {
  if (text == null) return;
  text = text.toString();
  var pattern = /(?<=:\s*).*?(?=\s*:)/gs;
  if (text.match(pattern) != null) {
    var str = text.match(pattern);
    str = str.filter(function(arr) {
      return /\S/.test(arr);
    });
    for (i = 0; i < str.length; i++) {
      if (emoji.URLS[str[i]] != undefined) {
        var output = emoji.of(str[i]);
        var emojiImage = output.url.replace(
          "assets-cdn.github",
          "github.githubassets"
        );
        text = text.replace(
          `:${str[i]}:`,
          `<img src="${emojiImage}" class="emoji">`
        );
      }
    }
    return text;
  } else {
    return text;
  }
}

async function addRepoDetails(document, username, opts) {
  const repos = await getRepos(username, opts);

  for (var i = 0; i < repos.length; i++) {
    let element;
    if (repos[i].fork == false) {
      element = document.getElementById("work_section");
    } else if (opts.includeFork == true) {
      document.getElementById("forks").style.display = "block";
      element = document.getElementById("forks_section");
    } else {
      continue;
    }

    element.innerHTML += `
      <a href="${repos[i].html_url}" target="_blank">
        <section>
          <div class="section_title">${repos[i].name}</div>
          <div class="about_section">
            <span 
              style="display:${!repos[i].description ? "none" : "block"};">
                ${convertToEmoji(repos[i].description)}
            </span>
          </div>
          <div class="bottom_section">
            <span 
              style="display:${!repos[i].language ? "none" : "inline-block"};">
                <i class="fas fa-code"></i>&nbsp; 
                ${repos[i].language}
            </span>
            <span><i class="fas fa-star"></i>&nbsp; 
              ${repos[i].stargazers_count}
            </span>
            <span><i class="fas fa-code-branch"></i>&nbsp;
              ${repos[i].forks_count}
            </span>
          </div>
        </section>
      </a>`;
  }
}

function addMetaTags(document, user, config = {}) {
  const nameArr = (user.name && user.name.split(" ").filter(Boolean)) || [];
  const data = {
    nameAndUsername: `${user.name} (@${user.login})`,
    firstName: nameArr[0],
    lastName: nameArr[nameArr.length - 1],
    image: config.socialPreviewImg || user.avatar_url,
    imageAlt: config.socialPreviewImg
      ? config.socialPreviewImgAlt
      : "User Avatar Picture"
  };
  const metaTags = {
    "og:url": config.url,
    "og:title": data.nameAndUsername,
    "og:image": data.image,
    "og:image:alt": data.imageAlt,
    "og:description": user.bio,
    "og:type": "profile",
    "profile:first_name": data.firstName,
    "profile:last_name": data.lastName,
    "profile:username": user.login,
    "twitter:card": "summary_large_image",
    "twitter:site": config.twitter,
    "twitter:creator": config.twitter,
    "twitter:image": data.image,
    "twitter:image:alt": data.imageAlt
  };

  const head = document.getElementsByTagName("head")[0];
  document.title = data.nameAndUsername;
  const icon = document.createElement("link");
  icon.setAttribute("rel", "icon");
  icon.setAttribute("href", user.avatar_url);
  icon.setAttribute("type", "image/png");
  head.appendChild(icon);
  const description = document.createElement("meta");
  icon.setAttribute("name", "description");
  icon.setAttribute("content", user.bio);
  head.appendChild(description);

  Object.keys(metaTags).forEach(property => {
    const el = document.createElement("meta");
    el.setAttribute("property", property);
    const content = metaTags[property];
    if (!content) return;
    el.setAttribute("content", content);
    head.appendChild(el);
  });
}

async function addAndUpdateBlogs(document, conf) {
  const blogConfig = await getBlog();
  if (blogConfig.length == 0) {
    return (document.getElementById("blog_section").style.display = "none");
  }
  const blogsEl = document.getElementById("blogs");
  for (var i = 0; i < blogConfig.length; i++) {
    const blogEl = document.createElement("a");
    const blogData = blogConfig[i];

    blogEl.setAttribute("href", `./blog/${blogData.url_title}/`);
    blogEl.setAttribute("target", "_blank");
    blogEl.innerHTML = `<section>
      <img src="${blogData.top_image}">
      <div class="blog_container">
          <div class="section_title">${blogData.title}</div>
          <div class="about_section">
              ${blogData.sub_title}
          </div>
      </div>
    </section>`;
    blogsEl.appendChild(blogEl);

    await updateBlogContent(blogData, conf);
  }
}

module.exports.updateHTML = async (username, opts) => {
  const { twitter, linkedin, medium, dribbble } = opts;
  const user = await getUser(username);
  const data = await getConfig();
  data[0].username = user.login;
  data[0].name = user.name;
  data[0].userimg = user.avatar_url;
  await updateConfig(data);

  //add data to assets/index.html
  const dom = await jsdom.fromFile(`${__dirname}/assets/index.html`, options);
  const window = dom.window;
  const document = window.document;

  console.log("Building HTML/CSS...");

  await addRepoDetails(document, username, opts);
  await addAndUpdateBlogs(document, data);
  addMetaTags(document, user, data[0]);

  document.getElementById(
    "profile_img"
  ).style.background = `url('${user.avatar_url}') center center`;
  document.getElementById("username").innerHTML = `<span style="display:${
    !user.name ? "none" : "block"
  };">
            ${user.name}
        </span>
        <a href="${user.html_url}">@${user.login}</a>`;

  //document.getElementById("github_link").href = `https://github.com/${user.login}`;
  document.getElementById("userbio").innerHTML = convertToEmoji(user.bio);
  document.getElementById("userbio").style.display = !user.bio
    ? "none"
    : "block";

  let about = `
        <span style="display:${!user.company ? "none" : "block"};">
            <i class="fas fa-users"></i> &nbsp; ${user.company}
        </span>
        <span style="display:${!user.email ? "none" : "block"};">
            <i class="fas fa-envelope"></i> &nbsp; ${user.email}
        </span>
        <span style="display:${!user.blog ? "none" : "block"};">
            <i class="fas fa-link"></i> &nbsp;
            <a href="${user.blog}">${user.blog}</a>
        </span>
        <span style="display:${!user.location ? "none" : "block"};">
            <i class="fas fa-map-marker-alt"></i> &nbsp;&nbsp; ${user.location}
        </span>`;

  about += `
    <span
      style="display:${!user.hireable ? "none" : "block"};">
        <i class="fas fa-user-tie"></i>
        &nbsp;&nbsp;
          ${
            data[0].hireLink
              ? `<a href="${data[0].hireLink}" target="_blank">`
              : ""
          }
            Available for hire
          ${data[0].hireLink ? `</a>` : ""}
    </span>`;

  about += `<div class="socials">
    <span style="display:${!twitter ? "none !important" : "block"};">
      <a href="https://www.twitter.com/${twitter}" target="_blank" class="socials"><i class="fab fa-twitter"></i></a>
    </span>
    <span style="display:${!dribbble ? "none !important" : "block"};">
      <a href="https://www.dribbble.com/${dribbble}" target="_blank" class="socials"><i class="fab fa-dribbble"></i></a>
    </span>
    <span style="display:${!linkedin ? "none !important" : "block"};">
      <a href="https://www.linkedin.com/in/${linkedin}/" target="_blank" class="socials"><i class="fab fa-linkedin-in"></i></a>
    </span>
    <span style="display:${!medium ? "none !important" : "block"};">
      <a href="https://www.medium.com/@${medium}/" target="_blank" class="socials"><i class="fab fa-medium-m"></i></a>
    </span>
  `;

  document.getElementById("about").innerHTML = about;

  await fs.writeFileAsync(
    `${outDir}/index.html`,
    "<!DOCTYPE html>" + window.document.documentElement.outerHTML
  );
  console.log(`Build Complete, Files can be Found @ ${outDir}`);
};
