const _ = require("lodash");
const bluebird = require("bluebird");
const fs = bluebird.promisifyAll(require("fs"));
const marked = require('marked');
const jsdom = require("jsdom").JSDOM,
  options = {
    resources: "usable"
  };
const { updateHTML } = require("./populate");
const { getConfig, getBlog, updateBlog, outDir } = require("./utils");

async function initBlogFiles(folder, blog_data, conf) {
  const blogPath = `${outDir}/blog/${folder}/index.html`;
  await fs.copyFileAsync(
    `${__dirname}/assets/blog/blogTemplate.html`,
    blogPath
  );
  const dom = await jsdom.fromFile(blogPath, options);
  const window = dom.window;
  const document = window.document;

  const icon = document.createElement("link");
  icon.setAttribute("rel", "icon");
  icon.setAttribute("href", conf[0].userimg);
  icon.setAttribute("type", "image/png");
  document.getElementsByTagName("head")[0].appendChild(icon);

  document.getElementById(
    "profile_img_blog"
  ).style.background = `url('${conf[0].userimg}') center center`;

  document.getElementById("username_blog").innerHTML = `
    <span style="display:${!conf[0].name ? "none" : "block"};">
      ${conf[0].name}
    </span>
    <br>@${conf[0].username}
    <br><b id="blog_time" data-iso="${blog_data.created_at.toISOString()}">
        ${blog_data.created_at.toLocaleDateString()}
    </b>`;

  if ((conf[0].theme = "dark.css")) {
    document.querySelector("#background_overlay").style.background =
      "linear-gradient(0deg, rgba(10, 10, 10, 1), rgba(10, 10, 10, 0.1))";
  } else {
    document.querySelector("#background_overlay").style.background =
      "linear-gradient(0deg, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0.1))";
  }

  document.getElementsByTagName("title")[0].textContent = blog_data.page_title;
  document.getElementById("blog_title").textContent = blog_data.title;
  document.getElementById("blog_sub_title").textContent = blog_data.sub_title;

  await fs.writeFileAsync(
    blogPath,
    "<!DOCTYPE html>" + window.document.documentElement.outerHTML
  );

  if (!fs.existsSync(`${outDir}/blog/${folder}/index.md`)) {
    // Create empty md file
    await fs.writeFileAsync(`${outDir}/blog/${folder}/index.md`, "Dummy Blog Content!");
  }
}

async function updateBlogContent(blogData, conf) {
  const blogPath = `${outDir}/blog/${blogData.url_title}/index`;
  const markdownContent = await fs.readFileAsync(`${blogPath}.md`);
  const html = marked(markdownContent.toString(), {
    baseUrl: conf[0].url,
    gfm: true,
    headerIds: true,
    headerPrefix: 'heading-',
  });
  const dom = await jsdom.fromFile(`${blogPath}.html`, options);
  const window = dom.window;
  const document = window.document;
  document.getElementById("blog").innerHTML = html;
  
  await fs.writeFileAsync(
    `${blogPath}.html`,
    "<!DOCTYPE html>" + window.document.documentElement.outerHTML
  );
}

async function createBlog(
  title,
  { subtitle, pagetitle, folder, image, update = false } = {}
) {
  if (!pagetitle) {
    pagetitle = title;
  }
  if (!folder) {
    folder = title;
  }
  folder = _.kebabCase(folder.toLowerCase());

  // Checks to make sure this directory actually exists
  // and creates it if it doesn't
  if (!fs.existsSync(`${outDir}/blog/`)) {
    fs.mkdirSync(`${outDir}/blog/`, { recursive: true }, err => {});
  }
  if (!fs.existsSync(`${outDir}/blog/${folder}`)) {
    fs.mkdirSync(`${outDir}/blog/${folder}`, { recursive: true });
  }
  const blog_data = {
    created_at: new Date(),
    url_title: folder,
    title: title,
    sub_title: subtitle,
    page_title: pagetitle,
    top_image:
      image ||
      "https://images.unsplash.com/photo-1553748024-d1b27fb3f960?w=1450",
    visible: true
  };
  const conf = await getConfig();
  const old_blogs = await getBlog();

  const conflicting = old_blogs.filter(
    blog => blog.url_title === blog_data.url_title
  );
  if (conflicting.length && !update) {
    console.error(
      "Blog conflicts with existing one. Use --update to overwrite"
    );
    return;
  }

  await initBlogFiles(folder, blog_data, conf);

  if (conflicting.length) {
    old_blogs.forEach(blog => {
      if (blog.url_title !== blog_data.url_title) return;
      blog_data.modified_at = blog_data.created_at;
      delete blog_data.created_at;
      Object.assign(blog, blog_data);
    });
  } else {
    old_blogs.push(blog_data);
  }
  await updateBlog(old_blogs);
}

async function blogCommand(title, program) {
  /* Check if build has been executed before blog this will prevent it from giving "link : index.css" error */
  if (
    !fs.existsSync(`${outDir}/index.html`) ||
    !fs.existsSync(`${outDir}/index.css`)
  ) {
    return console.error("You need to run build command before using blog one");
  }
  return createBlog(title, program);
}

module.exports = {
  blogCommand,
  updateBlogContent,
};
