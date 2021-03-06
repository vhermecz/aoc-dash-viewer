import React from 'react';
import './App.css';
import axios from 'axios';
import {Box, Grid, Table, TextField, TableRow, TableCell} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import fetch from 'node-fetch';
import {demodata} from "./demodata";
import lodash from "lodash";
import Autocomplete from "./Autocomplete";

const useStyles = makeStyles(theme => ({
  vText: {
    height: 140,
    whiteSpace: 'nowrap',
    '& div': {
      transform: 'translate(25px, 51px) rotate(315deg)',
      width: 30,
      '& span': {
        borderBottom: "1px solid #ccc",
        padding: "5px 10px",
      }
    }
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

function calcDelta(ts, i) {
  if (!ts) {
    return;
  }
  const FIRST_DAY_TS = 1606798800;
  return (ts|0) - (FIRST_DAY_TS+86400*(i-1));
}

function formatDelta(value) {
  if (!value) {
    return;
  }
  return formatDDHHMMSS(value);
}

async function getApiData(sessionId, dashboardId) {
  // FIXME: Clean up request
  return fetch(`https://adventofcode.com/2020/leaderboard/private/view/${dashboardId}.json`, {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en,en-US;q=0.9,hu;q=0.8,fr;q=0.7",
      "cache-control": "max-age=0",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "cookie": `session=${sessionId}`
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET",
    "mode": "cors"
  });
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
  },
  API_GLOBAL: {
    "field": "global_score",
    "label": "API Global Score",
  },
  LOCAL_API: {
    "field": "local_local_score",
    "label": "Local Score",
  },
  LOCAL_DELTA: {
    "field": "local_delta_score",
    "label": "StarDelta Score",
  },
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
      [Score.LOCAL_API, (userObj) => getStar(userObj, day, 1, MISSING_TIMESTAMP)],
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

function App() {
  const classes = useStyles();
  const [data, setData] = React.useState(null);
  const [sessionId, setSessionId] = React.useState("TBD");
  const [dashId, setDashId] = React.useState("TBD");
  const [orderBy, setOrderBy] = React.useState(null);
  const [scoreBy, setScoreBy] = React.useState(Score.API_LOCAL);
  const [users, setUsers] = React.useState([]);
  React.useEffect(() => {
    const read = async() => {
      //const resp = getApiData(sessionId, 0/*TBD*/);
      //setData(resp.data);
      const data = demodata;
      setData(mixinExtraData(demodata));
    }
    read();
  }, [sessionId]);
  React.useEffect(() => {
    if (!data) {
      return;
    }
    let comparator = (a,b) => compareFunction(a.name, b.name);
    if (orderBy !== null) {
      if (orderBy > 0) {
        comparator = (a, b) => compareFunction(getDelta(a, orderBy, MISSING_TIMESTAMP), getDelta(b, orderBy, MISSING_TIMESTAMP));
      } else {
        comparator = (a,b) => compareFunction(-a[scoreBy.field], -b[scoreBy.field]);
      }
    }
    setUsers(Object.values(data["members"]).sort(comparator).map(x=>x.id))
  }, [data, orderBy]);
  const handleOrderBy = (idx) => {
    if (idx===orderBy) {
      setOrderBy(null);
    } else {
      setOrderBy(idx);
    }
  }

  if (!data) {
    return "No data";
  }
  const numDays = Math.max(
      ...Object.values(data["members"]).map(
          x => Object.keys(x["completion_day_level"]).length
      )
  );
  const days = [...Array(numDays)].map((_, i) => i+1);
  const scoreByDelta = scoreBy === Score.LOCAL_DELTA;

  return (
      <Box p={2}>
        <Grid container>
          <Grid item xs={6}>
            <TextField
                fullWidth
                label="Session ID"
                value={sessionId}
                onChange={(e)=>setSessionId(e.target.value)}
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
        </Grid>
        <Table style={{width:'auto'}}>
          <TableRow>
            <TableCell>AOC</TableCell>
            {users.map(uid =>
                <TableCell class={classes.vText}>
                  <Box>
                    <span>
                      {data["members"][uid]["name"]}
                    </span>
                  </Box>
                </TableCell>
            )}
          </TableRow>
          <TableRow>
            <TableCell onClick={()=>handleOrderBy(0)}>
              {orderBy===0 ? <b>Pts</b> : 'Pts'}
            </TableCell>
            {users.map(uid => {
              const score = data["members"][uid][scoreBy.field];
              return (
                  <TableCell>
                    {score}
                  </TableCell>
              )}
            )}
          </TableRow>
          {days.map(day =>
              <TableRow>
                <TableCell onClick={()=>handleOrderBy(day)}>
                  {orderBy===day ? <b>{day}</b> : day}
                </TableCell>
                {users.map(uid => {
                  const dayData = data["members"][uid]["completion_day_level"][day] || {};
                  const star1ts = (dayData["1"]||{})["get_star_ts"];
                  const star2ts = (dayData["2"]||{})["get_star_ts"];
                  return (
                      <TableCell>
                        {formatDelta(calcDelta(star1ts, day))}<br/>
                        {formatDelta(calcDelta(star2ts, day))}<br/>
                        {scoreByDelta&&star1ts && star2ts && formatDelta(star2ts-star1ts)}
                      </TableCell>
                  )}
                )}
              </TableRow>
          )}
        </Table>
      </Box>
 );
}

export default App;
