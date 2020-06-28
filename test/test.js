const {search, getSubtitles} = require('../src/service/yifysubtitles');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
require('dotenv').config();

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('API', function() {
  describe('#search()', function() {
    describe('with OMDB api key', function() {
      context('invalid key', function() {
        it('should catch an error', async function() {
          await expect(search({title: 'youth'}, 'abcd123')).to.be.rejected;
        });
      });

      context('invalid movie title', function() {
        it('should return 0', async function() {
          const results = await search({title: 'abcd1234'}, process.env.OMDB_KEY);

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf(0);
        });
      });

      context('valid title with invalid year', function() {
        it('should return 0', async function() {
          const results = await search({title: 'youth', year: 1990}, process.env.OMDB_KEY);

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf(0);
        });
      });

      context('valid title', function() {
        it('should return at least 1', async function() {
          const results = await search({title: 'youth'}, process.env.OMDB_KEY);

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf.least(1);
        });
      });

      context('valid title with valid year', function() {
        it('should return 1', async function() {
          const results = await search({title: 'youth', year: 2017}, process.env.OMDB_KEY);

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf(1);
        });
      });

      context('title with special character', function() {
        it('should return 1', async function() {
          const results = await search({title: 'Amélie', year: 2001}, process.env.OMDB_KEY);

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf(1);
        });
      });
    });

    describe('without OMDB api key', function() {
      context('invalid movie title', function() {
        it('should return 0', async function() {
          const results = await search({title: 'abcd1234'});

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf(0);
        });
      });

      context('valid title with invalid year', function() {
        it('should return 0', async function() {
          const results = await search({title: 'youth', year: 1990});

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf(0);
        });
      });

      context('valid title', function() {
        it('should return at least 1', async function() {
          const results = await search({title: 'youth'});

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf.least(1);
        });
      });

      context('valid title with valid year', function() {
        it('should return 1', async function() {
          const results = await search({title: 'youth', year: 2017});

          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf(1);
        });
      });
    });
  });

  describe('#getSubtitles()', function() {
    context('with invalid imdbId', function() {
      it('should return 0', async function() {
        const results = await getSubtitles('0000');

        expect(results).to.be.an('array');
        expect(results).to.have.lengthOf(0);
      });
    });

    context('with valid imdbId', function() {
      it('should return at least 1', async function() {
        const results = await getSubtitles('tt1396484');

        expect(results).to.be.an('array');
        expect(results).to.have.lengthOf.least(1);
      });
    });

  });
});
