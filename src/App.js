import React from 'react';
import './App.css';
import axios from 'axios';
import {Box, Grid, Table, TextField, TableRow, TableCell, TableBody} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
//import fetch from 'node-fetch';
import {demodata} from "./demodata";
import lodash from "lodash";
import Autocomplete from "./Autocomplete";
import {isValidSessionId, missingBrowserFeatures, qs_encode} from "./utils";

const CACHE_TIMEOUT_MS = 15*60*1000;
const EMPTY_DATA = {"members":{}};

const useStyles = makeStyles(theme => ({
  vText: {
    height: 140,
    whiteSpace: 'nowrap',
    fontWeight: 400,
    fontSize: '16px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    '& div': {
      transform: 'translate(25px, 51px) rotate(315deg)',
      width: 30,
      '& span': {
        padding: "5px 10px 5px 0px",
      }
    }
  },
  vData: { // this replaces the default class, so have to repeat a lot of junk. lame
    padding: '8px',
    width: '52px',
    minWidth: '52px',
    maxWidth: '52px',
    overflow: 'hidden',
  },
}));

function formatDDHHMMSS(delta) {
  const signStr = delta<0?"-":"";
  delta = Math.abs(delta);
  const sec = delta % 60;
  const min = Math.floor(delta / 60) % 60;
  const hour = Math.floor(delta / 3600) % 24;
  const day = Math.floor(delta / 86400);
  const hasDay = day !== 0;
  const hasHour = hasDay || hour !== 0;
  const hasMin = hasHour || min !== 0;
  return signStr +
      (!hasDay ? '' : String(day) + 'd') +
      (!hasHour ? '' : String(hour).padStart(hasDay ? 2 : 1, '0') + 'h') +
      (hasDay || !hasMin ? '' : String(min).padStart(hasHour ? 2 : 1, '0') + 'm') +
      (hasHour ? '' : String(sec).padStart(hasMin ? 2 : 1, '0') + 's');
}

function calcDelta(year, ts, i) {
  if (!ts) {
    return;
  }
  const first_day_ts = (new Date(year, 11, 1, 6, 0, 0)).getTime()/1000;
  return (ts|0) - (first_day_ts+86400*(i-1));
}

function formatDelta(value) {
  if (!value) {
    return;
  }
  return formatDDHHMMSS(value);
}

async function getApiDataReal(year, sessionId, dashboardId) {
  // return await fetch(`https://vhermecz-aoc-proxy.herokuapp.com/`, {
  //   "headers": {
  //     "x-stuff": JSON.stringify({'year':year, 'dash': dashboardId, 'session':sessionId}),
  //   },
  //   "body": null,
  //   "method": "POST",
  // });
  return await axios.post('https://vhermecz-aoc-proxy.herokuapp.com/', null, {
    headers: {
      "x-stuff": JSON.stringify({'year':year, 'dash': dashboardId, 'session':sessionId}),
    },
  });
}

async function getApiData(year, sessionId, dashboardId) {
  const key = `restapi-${dashboardId}-${year}`;
  let data = null;
  try {
    data = JSON.parse(localStorage.getItem(`restapi-${dashboardId}-${year}`));
  } catch (error) {
    // pass
  }
  if (data !== undefined && data !== null && data.timestamp !== undefined && Date.now() < (data.timestamp + CACHE_TIMEOUT_MS)) {
    console.log("Serving from cache");
    return data;
  }
  try {
    const res = await getApiDataReal(year, sessionId, dashboardId);
    console.log(res);
    data = {
      data: res.data || EMPTY_DATA,
      timestamp: Date.now(),
    }
    console.log(data);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.log("ERROR");
    // FIXME: Display error
    data = {
      error: "Connection problem",
      data: EMPTY_DATA,
      timestamp: Date.now(),
    }
  }
  return data;
}

function compareFunction(a,b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}

export const Score = Object.freeze({
  API_LOCAL: {
    "field": "local_score",
    "label": "API Local Score",
    "scoreMessage": "total local score as returned by the API",
    "orderMessage": "completion time of 2nd star",
  },
  API_GLOBAL: {
    "field": "global_score",
    "label": "API Global Score",
    "scoreMessage": "total global score as returned by the API",
    "orderMessage": "completion time of 2nd star",
  },
  LOCAL_API: {
    "field": "local_local_score",
    "label": "Local Score",
    "scoreMessage": "total local score as computed from timestamps",
    "orderMessage": "completion time of 2nd star",
  },
  LOCAL_API_FIRST: {
    "field": "local_local_score_first",
    "label": "Local Score (1st star only)",
    "scoreMessage": "total local score as computed from timestamps (only first star counts)",
    "orderMessage": "completion time of 1st star",
  },
  LOCAL_DELTA: {
    "field": "local_delta_score",
    "label": "StarDelta Score",
    "scoreMessage": "delta-time between first and second star (for late comers/risers)",
    "orderMessage": "delta-times between stars",
  },
});

Object.keys(Score).forEach((key) => {
  Score[key].key = key;
});

const MISSING_TIMESTAMP = 1e20;

function getStar(userObj, day, star, coalesce) {
  const value = ((userObj.completion_day_level[day]||{})[star]||{}).get_star_ts;
  if (value === undefined) {
    return coalesce;
  }
  return value;
}

function getDelta(userObj, day, coalesce) {
  const s1=getStar(userObj, day, 1);
  const s2=getStar(userObj, day, 2);
  if (s1 === undefined || s2 === undefined) {
    return coalesce;
  }
  return s2-s1;
}

function OrderMessage({orderBy, scoreBy, timestamp}) {
  return (
      <Box>
        <b>Scoring by </b>
        {scoreBy.scoreMessage}.
        <b> Ordering by </b>
        {
          (orderBy === null) ? (
              "username"
          ) : (orderBy === 0) ? (
              "score"
          ) : (
              scoreBy.orderMessage + ` for day #${orderBy}`
          )
        }
        &nbsp;(Queried at {new Date(timestamp).toString()})
      </Box>
  );
}

/**
 * Add in name for anons and some custom scoring
 */
function mixinExtraData(data) {
  Object.values(data["members"]).forEach( member => {
    member["name"] = member["name"] || `anon #${member["id"]}`;
    member[Score.LOCAL_API.field] = 0;
    member[Score.LOCAL_DELTA.field] = 0;
  });
  lodash.range(1, 26).forEach(day => {
    const members = Object.values(data["members"]);
    const SCORING_RULES = [
      [Score.LOCAL_API_FIRST, (userObj) => getStar(userObj, day, 1, MISSING_TIMESTAMP)],
      [Score.LOCAL_API, (userObj) => getStar(userObj, day, 2, MISSING_TIMESTAMP)],
      [Score.LOCAL_DELTA, (userObj) => getDelta(userObj, day, MISSING_TIMESTAMP)],
    ];
    SCORING_RULES.forEach(([targetField, order]) => {
      members.sort((a,b) => compareFunction(order(a), order(b)));
      members.forEach((member, idx) => {
        if (order(member) !== MISSING_TIMESTAMP) {
          member[targetField.field] += members.length - idx;
        }
      })
    });
  });
  return data;
}

/** Validate if value is a proper number **/
function isNumber(value, {minValue, maxValue}={}) {
  if (((value|0)+"")!==value) {
    return false;
  }
  const num = value|0;
  if (minValue !== undefined && num < minValue) {
    return false;
  }
  if (maxValue !== undefined && num > maxValue) {
    return false;
  }
  return true;
}

function App() {
  const classes = useStyles();
  const [data, setData] = React.useState(EMPTY_DATA);
  const [dataTime, setDataTime] = React.useState(null);
  const [sessionId, setSessionId] = React.useState("");
  const [dashId, setDashId] = React.useState("");
  const [orderBy, setOrderBy] = React.useState(null);
  const [scoreBy, setScoreBy] = React.useState(Score.API_LOCAL);
  const [users, setUsers] = React.useState([]);
  const [year, setYear] = React.useState(2022);
  React.useEffect( () => {
    // updateFromUrl on first load
    const initParams = (new URL(window.location.href)).searchParams;
    if (isNumber(initParams.get('year'), {minValue: 2015, maxValue: 2022})) {
      setYear(initParams.get('year')|0);
    }
    if (initParams.get('dash')) {
      setDashId(initParams.get('dash'));
    }
    if (isNumber(initParams.get('order'))) {
      setOrderBy(initParams.get('order'));
    }
    if (Object.keys(Score).indexOf(initParams.get('score'))>-1) {
      setScoreBy(Score[initParams.get('score')]);
    }
    if (localStorage !== undefined) {
      setSessionId(localStorage.getItem("sessionId") || "");
    }
  }, []);
  React.useEffect(() => {
    // updateUrl on change
    let qs = {
      year: year,
      order: orderBy===undefined?-1:orderBy,
      dash: dashId,
      score: scoreBy.key,
    };
    window.history.replaceState({}, null, "?" + qs_encode(qs));
  }, [year, dashId, orderBy, scoreBy]);
  React.useEffect(() => {
    localStorage.setItem("sessionId", sessionId);
  }, [sessionId]);
  React.useEffect(() => {
    if (!sessionId || !dashId || !year) return;
    const read = async() => {
      const resp = await getApiData(year, sessionId, dashId);
      setDataTime(resp.timestamp);
      setData(mixinExtraData(resp.data));
    }
    read();
  }, [sessionId, year, dashId]);
  React.useEffect(() => {
    if (!data) {
      return;
    }
    let comparator = (a,b) => compareFunction(a.name, b.name);
    if (orderBy !== null) {
      if (orderBy > 0) {
        if (scoreBy === Score.LOCAL_DELTA) {
          comparator = (a, b) => compareFunction(getDelta(a, orderBy, MISSING_TIMESTAMP), getDelta(b, orderBy, MISSING_TIMESTAMP));
        } else if (scoreBy === Score.LOCAL_API_FIRST) {
          comparator = (a, b) => compareFunction(getStar(a, orderBy, 1, MISSING_TIMESTAMP), getStar(b, orderBy, 1, MISSING_TIMESTAMP));
        } else if ([Score.LOCAL_API, Score.API_LOCAL, Score.API_GLOBAL].indexOf(scoreBy) > -1) {
          comparator = (a, b) => compareFunction(getStar(a, orderBy, 2, MISSING_TIMESTAMP), getStar(b, orderBy, 2, MISSING_TIMESTAMP));
        } else {
          throw "Fuck yah!";
        }
      } else {
        comparator = (a, b) => compareFunction(-a[scoreBy.field], -b[scoreBy.field]);
      }
    }
    setUsers(Object.values(data["members"]).sort(comparator).map(x=>x.id))
  }, [data, orderBy, scoreBy]);
  const handleOrderBy = (idx) => {
    if (idx===orderBy) {
      setOrderBy(null);
    } else {
      setOrderBy(idx);
    }
  }

  const numDays = Math.max(0,
      ...Object.values(data["members"]).map(
          x => Object.keys(x["completion_day_level"]).length
      )
  );
  const days = [...Array(numDays)].map((_, i) => i+1);
  const scoreByDelta = scoreBy === Score.LOCAL_DELTA;

  return (missingBrowserFeatures().length > 0) ? (
      "Sorry your browser is lame"
  ) : (
      <Box p={2}>
        <Grid container>
          <Grid item xs={4}>
            <TextField
                fullWidth
                label="Session ID"
                value={sessionId}
                onChange={(e)=>setSessionId(e.target.value)}
            />
          </Grid>
          <Grid item xs={1}/>
          <Grid item xs={1}>
            <Autocomplete
                label="Year"
                options={[2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022]}
                labelGetter={(x)=>x+""}
                valueGetter={(x)=>x}
                value={year}
                onChange={setYear}
            />
          </Grid>
          <Grid item xs={3}>
            <Autocomplete
                label="Score"
                options={Object.values(Score)}
                labelGetter={(x)=>x.label}
                valueGetter={(x)=>x}
                value={scoreBy}
                onChange={setScoreBy}
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
                fullWidth
                label="Dashboard ID"
                value={dashId}
                onChange={(e)=>setDashId(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <OrderMessage orderBy={orderBy} scoreBy={scoreBy} timestamp={dataTime}/>
          </Grid>
        </Grid>
        {
          (!isValidSessionId(sessionId)) ? (
              <Box pl={4}>
                <pre>
                  <br/>
                  <br/>
                  Your sessionId is missing or invalid.<br/>
                  The sessionId is the 'session' cookie used by the AoC site to identify you.<br/>
                  To get it:<br/>
                  - Open developer tools<br/>
                  - Switch to the network tab<br/>
                  - Filter for 'advent'<br/>
                  - Open the https://adventofcode.com/ page<br/>
                  - Look for the request in the network tab with name 'adventofcode.com' and click on it<br/>
                  - Look for 'cookie:' in the 'Request Headers' section<br/>
                  - You will see something like 'session=851de75753d31b6fbcfa00fe44d87dfea738f8d6ed5318bd5e1c2f6b7a9f116203403013d6466cbc2768048ac73e51b8'<br/>
                  - Copy the hexadecimal number into the sessionId field<br/>
                  - Be happy now!<br/>
                  <br/>
                  NOTE: We cache your sessionId in the browser's localStorage for convenience, so you only have to provide it once. It auto-expires after a month (according to AoC site)
                </pre>
              </Box>
          ) : (!data) ? (
              "No data"
          ) : (
              <Table style={{width: 'auto'}}>
                <TableBody>
                  <TableRow>
                    <TableCell>AOC</TableCell>
                    {users.map(uid =>
                        <TableCell class={classes.vText}>
                          {/* FIXME: using className (as it should be) breaks the layout, but have no clue why*/}
                          <Box>
                          <span>
                            {data["members"][uid]["name"]}
                          </span>
                          </Box>
                        </TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell onClick={() => handleOrderBy(0)}>
                      {orderBy === 0 ? <b>Pts</b> : 'Pts'}
                    </TableCell>
                    {users.map(uid => {
                          const score = data["members"][uid][scoreBy.field];
                          return (
                              <TableCell>
                                {score}
                              </TableCell>
                          )
                        }
                    )}
                  </TableRow>
                  {days.map(day =>
                      <TableRow>
                        <TableCell onClick={() => handleOrderBy(day)}>
                          {orderBy === day ? <b>{day}</b> : day}
                        </TableCell>
                        {users.map(uid => {
                              const dayData = data["members"][uid]["completion_day_level"][day] || {};
                              const star1ts = (dayData["1"] || {})["get_star_ts"];
                              const star2ts = (dayData["2"] || {})["get_star_ts"];
                              return (
                                  <TableCell className={classes.vData}>
                                    {formatDelta(calcDelta(year, star1ts, day))}<br/>
                                    {formatDelta(calcDelta(year, star2ts, day))}<br/>
                                    {scoreByDelta && star1ts && star2ts && formatDelta(star2ts - star1ts)}
                                  </TableCell>
                              )
                            }
                        )}
                      </TableRow>
                  )}
                </TableBody>
              </Table>
          )
        }
      </Box>
 );
}

export default App;
