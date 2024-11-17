const express = require("express");
const path = require("path"); // {{ edit_1 }}
const app = express();
const port = 3243;
const contentService = require("./content-service");

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: "dpy8pnzaq",
  api_key: "317115569113495",
  api_secret: "qfJW8rOkDLsoOxJH7Gn74XQRpYk",
  secure: true,
});

const upload = multer();

app.use(express.static(path.join(__dirname, "public")));

// Initialize content service
contentService
  .initialize()
  .then(() => {
    console.log("Content service initialized");

    // Serve 'about.html' from the root route
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "about.html"));
    });

    // Serve 'about.html' from the '/about' route
    app.get("/about", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "about.html"));
    });

    app.get("/articles/add", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "addArticle.html"));
    });

    // Handle form submission to add a new article
    app.post(
      "/articles/add",
      upload.single("featureImage"),
      async (req, res) => {
        try {
          // Upload feature image to Cloudinary (if provided)
          const imageUrl = req.file
            ? (await cloudinary.uploader.upload(req.file.buffer)).url
            : "";

          // Add image URL to the body of the form submission
          req.body.featureImage = imageUrl;

          // Auto-generate article ID here (e.g., the next available ID)
          req.body.id = contentService.getNextArticleId(); // Ensure getNextArticleId() is defined in contentService

          // Add the article to your service or database
          await contentService.addArticle(req.body);

          // Redirect to the list of articles after adding the new article
          res.redirect("/articles");
        } catch (err) {
          res
            .status(500)
            .json({ message: "Error occurred", error: err.message });
        }
      }
    );

    // Article retrieval and filtering routes
    app.get("/articles", (req, res) => {
      const { category, minDate } = req.query;

      if (category) {
        contentService
          .getArticlesByCategory(category)
          .then((articles) => res.json(articles));
      } else if (minDate) {
        contentService
          .getArticlesByMinDate(minDate)
          .then((articles) => res.json(articles));
      } else {
        contentService.getAllArticles().then((articles) => res.json(articles));
      }
    });

    app.get("/articles/:id", (req, res) => {
      const articleId = req.params.id;
      contentService
        .getArticleById(articleId)
        .then((article) => {
          res.json(article);
        })
        .catch((err) => {
          res.status(404).json({ message: err });
        });
    });

    // Categories route
    app.get("/categories", (req, res) => {
      contentService
        .getCategories()
        .then((categories) => res.json(categories))
        .catch((err) =>
          res
            .status(500)
            .json({ message: "Internal Server Error", error: err.message })
        );
    });

    app.listen(port, () => {
      console.log(`Express http server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
