import React from "react";
import TextField from "@material-ui/core/TextField";
import ReactAutocomplete from "@material-ui/lab/Autocomplete";
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  leanAutocomplete: {
    '&.MuiAutocomplete-hasPopupIcon.MuiAutocomplete-hasClearIcon .MuiAutocomplete-inputRoot': {
      paddingRight: 4,
    },
  },
}));


function fixAutocompleteBug(x) {
  // Used for Autocomplete
  // Original code uses off for the autoComplete value, that is not cool
  x["inputProps"]["autoComplete"] = "new-password";
  return x
}

export function Autocomplete({value, onChange, options, labelGetter, valueGetter, ...fieldArgs}) {
  const classes = useStyles();
  if (valueGetter === undefined) {
    valueGetter = x=>x;
  }
  return <ReactAutocomplete
      options={options}
      classes={{
        root: classes.leanAutocomplete
      }}
      getOptionLabel={(...args) => labelGetter(...args) || ""}
      closeIcon=""
      popupIcon=""
      value={[...options.filter((option)=>valueGetter(option)===value), null][0]}
      onChange={(_, value) => onChange(valueGetter(value))}
      renderInput={(params) => (
          <TextField
              {...fixAutocompleteBug(params)}
              {...fieldArgs}
          />)}
  />;
}

export function fieldGetter(fieldName) {
  return (object) => object?.[fieldName];
}

export default Autocomplete;
