// Builds the API's JSON shapes explicitly, so the response never depends on
// which columns a query happened to load (and never leaks one by accident).

const imageUrl = (filename) => `/static/images/${filename}`;

function serializeAuthor(user) {
  return { id: user.id, username: user.username };
}

function serializeUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

function serializeCaption(caption, { withImageId = false } = {}) {
  return {
    id: caption.id,
    text: caption.text,
    ...(withImageId && { imageId: caption.imageId }),
    author: serializeAuthor(caption.author),
    createdAt: caption.createdAt,
  };
}

function serializeImageSummary(image) {
  return {
    id: image.id,
    title: image.title,
    url: imageUrl(image.filename),
    altText: image.altText,
  };
}

function serializeImageDetail(image) {
  return {
    ...serializeImageSummary(image),
    description: image.description,
    captions: image.captions.map((caption) => serializeCaption(caption)),
  };
}

module.exports = {
  serializeUser,
  serializeCaption,
  serializeImageSummary,
  serializeImageDetail,
};
