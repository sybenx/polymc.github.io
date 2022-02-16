const { DateTime } = require("luxon");
const fs = require("fs");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginNavigation = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const cleanCSS = require("clean-css");
const { EleventyRenderPlugin } = require("@11ty/eleventy");


module.exports = function (eleventyConfig) {
	eleventyConfig.addPassthroughCopy("src/assets");
	eleventyConfig.addPassthroughCopy("src/favicon.ico");
    eleventyConfig.addPassthroughCopy("src/.well-known");

	// Add plugins
	eleventyConfig.addPlugin(pluginRss);
	eleventyConfig.addPlugin(pluginSyntaxHighlight);
	eleventyConfig.addPlugin(pluginNavigation);
	eleventyConfig.addPlugin(EleventyRenderPlugin);
	

	// Alias `layout: post` to `layout: layouts/post.njk`
	eleventyConfig.addLayoutAlias("post", "layouts/post.njk");

	eleventyConfig.addFilter("cssmin", function(code) {
		return new cleanCSS({}).minify(code).styles;
	});

	eleventyConfig.addFilter("readableDate", dateObj => {
		return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat("dd LLL yyyy");
	});

	// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
	eleventyConfig.addFilter('htmlDateString', (dateObj) => {
		return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('yyyy-LL-dd');
	});

	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if (!Array.isArray(array) || array.length === 0) {
			return [];
		}
		if (n < 0) {
			return array.slice(n);
		}

		return array.slice(0, n);
	});

	// Return the smallest number argument
	eleventyConfig.addFilter("min", (...numbers) => {
		return Math.min.apply(null, numbers);
	});

	function filterTagList(tags) {
		return (tags || []).filter(tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1);
	}

	eleventyConfig.addFilter("filterTagList", filterTagList)

	// Navigation

	// Header Navigation
	eleventyConfig.addCollection('nav', function (collections) {
		return collections.getFilteredByGlob('src/*');
	});

	// Wiki navigation
	eleventyConfig.addCollection('wiki', function (collections) {
		return collections.getFilteredByGlob('src/wiki/**/*');
	});

	// Create an array of all tags
	eleventyConfig.addCollection("tagList", function (collection) {
		let tagSet = new Set();
		collection.getAll().forEach(item => {
			(item.data.tags || []).forEach(tag => tagSet.add(tag));
		});

		return filterTagList([...tagSet]);
	});

	// Customize Markdown library and settings:
	let markdownLibrary = markdownIt({
		html: true,
		breaks: false,
		linkify: true
	}).use(markdownItAnchor, require('markdown-it-task-checkbox'),{
		permalink: markdownItAnchor.permalink.ariaHidden({
			placement: "after",
			class: "direct-link",
			symbol: "#",
			level: [1, 2, 3, 4],
		}),
		slugify: eleventyConfig.getFilter("slug")
	});
	markdownLibrary.render('- [x] unchecked')
	eleventyConfig.setLibrary("md", markdownLibrary);

	// Override Browsersync defaults (used only with --serve)
	eleventyConfig.setBrowserSyncConfig({
		callbacks: {
			ready: function (err, browserSync) {
				const content_404 = fs.readFileSync('_site/404.html');

				browserSync.addMiddleware("*", (req, res) => {
					// Provides the 404 content without redirect.
					res.writeHead(404, { "Content-Type": "text/html; charset=UTF-8" });
					res.write(content_404);
					res.end();
				});
			},
		},
		ui: false,
		ghostMode: false
	});

	return {
		// Control which files Eleventy will process
		// e.g.: *.md, *.njk, *.html, *.liquid
		templateFormats: [
			"md",
			"njk",
			"html",
			"11ty.js"
		],

		// Pre-process *.md files with: (default: `liquid`)
		markdownTemplateEngine: "njk",

		// Pre-process *.html files with: (default: `liquid`)
		htmlTemplateEngine: "njk",

		dir: {
			input: "src",
			includes: "_includes",
			data: "_data",
			output: "_site"
		}
	};
};