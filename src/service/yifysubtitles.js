'use strict';

const cheerio = require('cheerio');
const fs = require('fs');
const superagent = require('superagent');
const extract = require('extract-zip');

const YIYFSUBTITLES_URL = 'https://yifysubtitles.com';
const YTS_URL = 'https://yts.mx/api/v2';
const OMDB_URL = 'https://www.omdbapi.com';

async function search(movie, omdbKey = '') {
  if (omdbKey === '') {
    return await searchYTS(movie);
  } else {
    return await searchOmdb(movie, omdbKey);
  }
}

async function searchYTS(movie) {
  let response = await superagent.get(`${ YTS_URL }/list_movies.json`).query({query_term: movie.title});
  let results = [];

  if (response.body['data']['movie_count'] === 0) {
    return results;
  }

  results = response.body['data']['movies'].filter(item => item['title'].toLowerCase() === movie.title.toLowerCase());

  if (movie.year !== undefined) {
    results = results.filter(item => item['year'] === movie.year);
  }

  return results.map(item => {
    return {
      imdbId: item['imdb_code'],
      title: item['title'],
      year: item['year'],
    };
  });
}

async function searchOmdb(movie, omdbKey) {
  try {
    let results = [];
    let response = await superagent.get(OMDB_URL).
        query({apikey: omdbKey, s: movie.title, type: 'movie', y: movie.year === undefined ? '' : movie.year});
    if (response.body['Response'] === 'False') {
      return results;
    }

    results = response.body['Search'].filter(item => item['Title'].toLowerCase() === movie.title.toLowerCase());

    if (movie.year !== undefined) {
      results = results.filter(item => item['Year'] === movie.year.toString());
    }

    return results.map(item => {
      return {
        imdbId: item['imdbID'],
        title: item['Title'],
        year: item['Year'],
      };
    });
  } catch (e) {
    throw new Error(e.response.body['Error']);
  }
}

async function getSubtitles(imdbId) {
  let response = await superagent.get(`${ YIYFSUBTITLES_URL }/movie-imdb/${ imdbId }`);

  let $ = cheerio.load(response.text);
  let subtitles = [];

  $('tbody tr').each(function() {
    let subtitle = {
      language: $(this).find('.sub-lang').text().trim(),
      name: $(this).find('td').eq(2).find('a').text().trim().replace('subtitle ', ''),
      url: `${ YIYFSUBTITLES_URL }${ $(this).
          find('.subtitle-download').
          attr('href').
          replace('subtitles', 'subtitle') }.zip`,
      uploader: $(this).find('.uploader-cell').text(),
      rating: $(this).find('.rating-cell .label').text().trim(),
    };
    subtitles.push(subtitle);
  });

  return subtitles;
}

function downloadSubtitle(url, outputDir) {
  let file = url.split('/').slice(-1)[0];
  let stream = fs.createWriteStream(file);

  superagent.get(url).pipe(stream).on('finish', function() {
        try {
          extract(file, {dir: outputDir}).finally(() =>
              fs.unlinkSync(file),
          );
        } catch (err) {
          throw new Error(err);
        }
      },
  );
}

// search({ title: 'youth' }, '46e1a00').then(r => console.log('done'))

module.exports = {search, getSubtitles, downloadSubtitle};
