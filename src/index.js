#!/usr/bin/env node
'use strict';

const {search, getSubtitles, downloadSubtitle} = require('./service/yifysubtitles');
const languages = require('./constants/languages');
const videoFormat = require('./constants/video-format');
const fs = require('fs');
const ptt = require('parse-torrent-title');
const path = require('path');
const {prompt} = require('enquirer');
const {green, red, yellow} = require('kleur');

function hasVideo(moviePath) {
  return fs.readdirSync(moviePath).
      filter(file => videoFormat.includes(path.extname(file).toLowerCase())).length > 0;
}

function parseFiles(moviePath) {
  return fs.readdirSync(moviePath).
      filter(file => videoFormat.includes(path.extname(file).toLowerCase())).
      map(file => ptt.parse(file));
}

async function selectSubtitles(subtitles) {
  if (subtitles.length === 1) {
    return [subtitles[0]['url']];
  }

  let {url} = await prompt({
    type: 'multiselect',
    name: 'url',
    message: 'Which subtitles do you want?',
    multiple: true,
    choices: subtitles.map(sub => {
      return {
        title: `${ sub.rating } - ${ sub.name } (${ sub.language }) - ${ sub.uploader }`,
        value: sub.url,
      };
    }),
    result(values) {
      return values.map(value => this.find(value).value);
    },
  });

  return url;
}

async function selectImdbId(results) {
  if (results.length === 1) {
    return results[0]['imdbId'];
  }

  let {imdbId} = await prompt({
    type: 'select',
    name: 'imdbId',
    message: 'Too many search results. Pick a movie',
    choices: results.map(result => {
      return {
        title: `${ result['year'] } - ${ result['title'] } - ${ result['imdbId'] }`,
        value: result['imdbId'],
      };
    }),
    result(value) {
      return this.map(value)[value];
    },
  });

  return imdbId;
}

async function setup() {
  let response = await prompt([
    {
      type: 'input',
      name: 'moviePath',
      message: 'Path to the movie folder',
      validate: (value) => {
        try {
          return hasVideo(value) ? true : 'Directory does not contain video files';
        } catch (err) {
          return 'Error reading directory';
        }
      },
    },
    {
      type: 'autocomplete',
      name: 'language',
      message: 'Pick your languages',
      min: 1,
      multiple: true,
      choices: languages,
      validate() {
        return this.selected.length > 0 ? true : 'Must select at least one language';
      },
    },
    {
      type: 'input',
      name: 'downloadPath',
      message: 'Save subtitles to',
      initial() {
        return this.state.answers.moviePath;
      },
    },
    {
      type: 'input',
      name: 'omdbKey',
      message: 'Enter OMDB API key to use OMDB for obtaining movie info (Leave blank to use YTS API)',
      initial: '',
    },
  ]);

  return response;
}

async function start() {
  let {moviePath, language, downloadPath, omdbKey} = await setup();
  let movies = parseFiles(moviePath);

  if (movies.length === 0) {
    throw new Error('Cannot find any videos');
  }

  for (let i = 0; i < movies.length; i++) {
    console.log(`Downloading... [${ i + 1 }/${ movies.length }]`);
    console.log(`${ green('year' in movies[i] ? movies[i].year : 'Unknown') } - ${ movies[i].title }`);

    let results = await search(movies[i], omdbKey);

    if (results.length >= 1) {
      let imdbId = await selectImdbId(results);
      let res = await getSubtitles(imdbId);
      let subtitles = res.filter(subtitle => language.includes(subtitle['language']));

      if (subtitles.length >= 1) {
        let urls = await selectSubtitles(subtitles);

        for (let j = 0; j < urls.length; j++) {
          downloadSubtitle(urls[j], downloadPath);
        }
      } else {
        console.error(`${ red('No subtitle available in') } ${ yellow(language) }`);
      }
    } else {
      console.error(red('No result'));
    }
  }

  console.log(green('Done'));
}

start().catch(err => console.error(err));
