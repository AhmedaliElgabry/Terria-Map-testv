import Handlebars from "handlebars";
import moment from "moment";
import React from "react";
import defined from "terriajs-cesium/Source/Core/defined";
import VarType from "../../../Map/VarType";
import parseCustomHtmlToReact from "../../Custom/parseCustomHtmlToReact";

// Do not remove. This is needed for webpack to include the helpers module.
const hanldebarsHelpers = require("handlebars-helpers")([
  "comparison",
  "number"
]);

function renderTemplate(templateString, data) {
  const template = Handlebars.compile(templateString); // Create template
  const computed = template(data); // hydrate
  return parseCustomHtmlToReact(computed); // convert value to react
}

export function cellRenderer(props) {
  const { row, column } = props;
  const { key, type, dateFormat, style } = column;
  const value = row[key];

  if (defined(style) && defined(style.valueTemplate)) {
    let valueTemplate = style.valueTemplate;

    try {
      if (typeof valueTemplate == "object") {
        if (Array.isArray(valueTemplate)) {
          valueTemplate = valueTemplate.join(" ");
        }

        if (defined(valueTemplate.partials)) {
          // const existingPartials = Object.keys(Handlebars.partials);
          Object.entries(valueTemplate.partials)
            // .filter(([partial]) => existingPartials.indexOf(partial) == -1)
            .forEach(([partial, template]) =>
              Handlebars.registerPartial(partial, template)
            );
        }

        return renderTemplate(valueTemplate.template, row);
      }

      return renderTemplate(valueTemplate, row);
    } catch (error) {
      console.error(error);
      // Ignore the template, display the value based on the varType
    }
  }

  switch (type) {
    case VarType.SCALAR:
      let formattedNumber = null;
      try {
        formattedNumber = new Number(value).toLocaleString();
      } catch {}
      return (
        <div title={value} style={{ textAlign: "right" }}>
          {formattedNumber || value}
        </div>
      );

    case VarType.TIME:
      let formattedDate = null,
        daysAgo = null;

      try {
        const date = new Date(new String(value));
        const momentDate = moment.utc(date);
        formattedDate = momentDate.isValid()
          ? momentDate.format(dateFormat)
          : value;
        daysAgo = momentDate.isValid() ? momentDate.fromNow(true) : "";
      } catch {}
      return (
        <div
          title={`${value} ${daysAgo ? "- " + daysAgo + " ago" : ""}`}
          style={{ textAlign: "right" }}
        >
          {formattedDate || value}
        </div>
      );
  }

  return <span>{value}</span>;
}
