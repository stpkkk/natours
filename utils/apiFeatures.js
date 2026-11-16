module.exports = class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // Mongoose Query - Tour.find()
    this.queryString = queryString; // req.query - { sort: 'price', limit: '5' }
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // Mongoose принимает строку с пробелами, например "price" или "-price"
      // Но для надежности можно заменить запятые на пробелы, если нужно сортировать по нескольким полям
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Сортировка по умолчанию (опционально)
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }
  limit() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields); //include
    } else {
      // Сортировка по умолчанию (опционально)
      this.query = this.query.select('-__v'); //exclude (__v field from mongo)
    }

    return this;
  }

  paginate() {
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
};
