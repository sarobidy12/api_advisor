const express = require('express');
const {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  BAD_REQUEST,
} = require('http-status-codes');
const { adminGuard } = require('../middlewares/token');
const { upload } = require('../middlewares/upload');
const Post = require('../models/Post.model');
const { parse } = require('../utils/request');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const {
  getNextSequenceValue,
  decrementSequenceValue,
  getCurrentSequenceValue,
  resetSequenceValue,
} = require('../utils/counter');

router.get('/', async function (req, res, next) {
  const { limit, offset, filter = '{}' } = req.query;

  try {
    const postDocuments = Post.find(JSON.parse(filter));

    if (limit) postDocuments.limit(limit);
    if (offset) postDocuments.skip(offset);

    const posts = (await postDocuments).map((e) => e.toJSON());

    res.json(posts);
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.error(error);
    }
  }
});

router.get('/:id', async function (req, res, next) {
  const { id } = req.params;

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(NOT_FOUND).json({ message: 'Post not found' });

    res.json(post.toJSON());
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.post(
  '/',
  adminGuard,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imageWeb', maxCount: 1 },
  ]),
  async function (req, res, next) {
    const body = parse(req.body);
    const postData = {
      ...body,
      priority: await getNextSequenceValue('postPriority'),
      imageURL:
        req.files.image &&
        `${process.env.HOST_NAME}/uploads/posts/${req.files.image[0].filename}`,
      imageWebURL:
        req.files.imageWeb &&
        `${process.env.HOST_NAME}/uploads/posts/${req.files.imageWeb[0].filename}`,
    };

    if (!body)
      return res.status(BAD_REQUEST).json({ message: 'No post data provided' });

    try {
      const post = new Post(postData);

      await post.save({
        validateBeforeSave: true,
      });

      res.json(post.toJSON());
    } catch (error) {
      res.status(INTERNAL_SERVER_ERROR);

      if (process.env.NODE_ENV === 'development') {
        console.error(error);
        res.json(error);
      }
    }
  },
);

router.put(
  '/:id',
  adminGuard,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imageWeb', maxCount: 1 },
  ]),
  async function (req, res, next) {
    const body = parse(req.body);

    if (Object.keys(req.files).length) {
      if (req.files.image) {
        body.imageURL = `${process.env.HOST_NAME}/uploads/posts/${req.files.image[0].filename}`;
      }

      if (req.files.imageWeb) {
        body.imageWebURL = `${process.env.HOST_NAME}/uploads/posts/${req.files.imageWeb[0].filename}`;
      }
    }

    try {
      if (body.imageURL || body.imageWebURL) {
        const post = await Post.findById(req.params.id);
        if (post.imageURL) {
          const imagePath = path.join(
            __dirname,
            '../public',
            post.imageURL.split(process.env.HOST_NAME)[1],
          );
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        if (post.imageWebURL) {
          const imagePath = path.join(
            __dirname,
            '../public',
            post.imageWebURL.split(process.env.HOST_NAME)[1],
          );
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }
      }

      await Post.updateOne({ _id: req.params.id }, body);
      res.json({ message: 'Successfully updated post' });
    } catch (error) {
      res.status(INTERNAL_SERVER_ERROR);

      if (process.env.NODE_ENV === 'development') {
        console.error(error);
        res.json(error);
      }
    }
  },
);

router.delete('/:id', async function (req, res, next) {
  const { id } = req.params;

  try {
    const post = await Post.findById(id);
    if (post.priority === (await getCurrentSequenceValue('postPriority')))
      await decrementSequenceValue('postPriority');

    if (post) {
      const imagePath = path.join(
        __dirname,
        '../public',
        post.imageURL.split(process.env.HOST_NAME)[1],
      );

      const imagePathWeb = path.join(
        __dirname,
        '../public',
        post.imageWebURL.split(process.env.HOST_NAME)[1],
      );

      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      if (fs.existsSync(imagePathWeb)) fs.unlinkSync(imagePathWeb);

      if (!(await Post.count())) resetSequenceValue('postPriority');

      await post.remove();
      res.json({ message: 'Successfully removed post' });
    } else {
      res.status(NOT_FOUND).json({ message: 'Post not found' });
    }
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

module.exports = router;
