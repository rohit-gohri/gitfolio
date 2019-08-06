const _ = require('lodash');
const bluebird = require('bluebird');
const fs = bluebird.promisifyAll(require('fs'));
const jsdom = require('jsdom').JSDOM,
options = {
    resources: "usable"
};
const {getBlog, updateBlog, outDir} = require('./utils');

async function createBlog(title, subtitle, pagetitle, folder) {
    // Checks to make sure this directory actually exists
    // and creates it if it doesn't
    if (!fs.existsSync(`${outDir}/blog/`)){
        fs.mkdirSync(`${outDir}/blog/`, { recursive: true }, err => {});
    }
    if (!fs.existsSync(`${outDir}/blog/${folder}`)){
        fs.mkdirSync(`${outDir}/blog/${folder}`, { recursive: true });
    }
    await fs.copyFileAsync(`${__dirname}/assets/blog/blogTemplate.html`, `${outDir}/blog/${folder}/index.html`);

    const dom = await jsdom.fromFile(`${outDir}/blog/${folder}/index.html`, options);
    const window = dom.window;
    const document = window.document;
    const style = document.createElement("link");
    style.setAttribute("rel","stylesheet")
    style.setAttribute("href","../../index.css");
    document.getElementsByTagName("head")[0].appendChild(style);
    
    document.getElementsByTagName("title")[0].textContent = pagetitle;
    document.getElementById("blog_title").textContent = title;
    document.getElementById("blog_sub_title").textContent = subtitle;

    await fs.writeFileAsync(`${outDir}/blog/${folder}/index.html`, '<!DOCTYPE html>'+window.document.documentElement.outerHTML);
    const blog_data = {
        url_title: folder,
        title: title,
        sub_title: subtitle,
        top_image: "https://images.unsplash.com/photo-1553748024-d1b27fb3f960?w=1450",
        visible: true,
    };
    const old_blogs = await getBlog();
    old_blogs.push(blog_data);
    await updateBlog(old_blogs);
}

async function blogCommand(title, program) {
    /* Check if build has been executed before blog this will prevent it from giving "link : index.css" error */
    if (!fs.existsSync(`${outDir}/index.html`) || !fs.existsSync(`${outDir}/index.css`)){
        return console.error("You need to run build command before using blog one");
    }
    if (!program.pagetitle) {
        program.pagetitle = title;
    }
    if (!program.folder) {
        program.folder = title;
    }
    program.folder = _.kebabCase(program.folder.toLowerCase());
    return createBlog(title, program.subtitle, program.pagetitle, program.folder);
}

module.exports = {
    blogCommand
};
