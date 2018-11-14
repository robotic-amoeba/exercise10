function cleanClone(document) {
  const copy = Object.assign({}, document._doc)
  delete copy._id;
  delete copy.__v;

  return copy;
}

module.exports = {
  cleanClone
};
