const workdir = "/tmp/";

// vanilla deps
let child_process = require('child_process');

// external deps
let fsextra = require("fs-extra");
var request = require('sync-request');

function github(result) {
  for(let repo in result) {
    let url = 'https://api.github.com/repos/' + repo;
    let buffer = request('GET', url,
      {'headers': {'user-agent': 'dotabap-validator',
        "Authorization": "token blah"
      }});
    let github = JSON.parse(buffer.getBody().toString());
    result[repo].repo = github;
  }
}

function countLines(json) {
  let result = {};

  for(let repo of json) {
    let cwd = workdir + repo;
    let buffer = child_process.execSync("find -name '*.abap' | xargs cat | wc -l", {cwd: cwd});
    let lines = parseInt(buffer.toString().trim());

    result[repo] = {};
    result[repo].lines = lines;
  }

  return result;
}

function cleanup(json) {
  for(let repo of json) {
    let cwd = workdir + repo;
    fsextra.removeSync(cwd);
  }
}

function gitExists(json) {
  for(let repo of json) {
    let cwd = workdir + repo;
    fsextra.ensureDirSync(cwd);
    let url = "https://github.com/" + repo + ".git";
    child_process.execSync("git clone " + url + " "+cwd, {cwd: cwd});
  }
}

function gitLog(json) {
  let out = "";
  for(let repo of json) {
    out = out + child_process.execSync(
      "git log --pretty=format:\"{\\\"repo\\\": \\\""+repo+"\\\", \\\"commit\\\": \\\"%H\\\", \\\"time\\\": \\\"%ad\\\"},\"",
      {cwd: workdir + repo}) + "\n";
  }
  out = "[" + out.slice(0, -2) + "]";
  console.log(out);
}

function validate(file, generate = false, log = false) {
  let json = JSON.parse(file);

  gitExists(json);

  let result;
  if (generate) {
    result = countLines(json);
  } else if (log) {
    gitLog(json);
  }
  cleanup(json);
  if (generate) {
    github(result);
    console.log(JSON.stringify(result, null, ' '));
  }
}

module.exports = validate;