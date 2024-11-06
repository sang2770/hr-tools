const TTEParser = (function () {
  let methods = {};
  /**
   * Parse HTML table to excel worksheet
   * @param {object} ws The worksheet object
   * @param {HTML entity} table The table to be converted to excel sheet
   */
  methods.parseDomToTable = function (ws, table, opts) {
    const emptyRowTop = opts.emptyRowTop || 0;
    let _r, _c, cs, rs, r, c;
    let rows = [...table.getElementsByTagName("tr")];
    let widths = table.getAttribute("data-cols-width");
    const styleTable = getStylesDataAttr(table);
    if (widths)
      widths = widths.split(",").map(function (item) {
        return parseInt(item);
      });
    let merges = [];
    for (_r = 0; _r < rows.length; ++_r) {
      let row = rows[_r];
      r = _r + 1; // Actual excel row number
      c = 1; // Actual excel col number
      if (row.getAttribute("data-exclude") === "true") {
        rows.splice(_r, 1);
        _r--;
        continue;
      }
      if (row.getAttribute("data-height")) {
        let exRow = ws.getRow(r + emptyRowTop);
        exRow.height = parseFloat(row.getAttribute("data-height"));
      }
      const styleRow = getStylesDataAttr(row);
      // console.log(styleGlobal)
      let tds = [...row.children];
      // console.log(row, styleGlobal);
      for (_c = 0; _c < tds.length; ++_c) {
        let td = tds[_c];
        if (td.getAttribute("data-exclude") === "true") {
          tds.splice(_c, 1);
          _c--;
          continue;
        }
        for (let _m = 0; _m < merges.length; ++_m) {
          var m = merges[_m];
          if (m.s.c == c && m.s.r <= r && r <= m.e.r) {
            c = m.e.c + 1;
            _m = -1;
          }
        }
        let exCell = ws.getCell(getColumnAddress(c, r + emptyRowTop));
        // calculate merges
        cs = parseInt(td.getAttribute("colspan")) || 1;
        rs = parseInt(td.getAttribute("rowspan")) || 1;
        if (cs > 1 || rs > 1) {
          merges.push({
            s: { c: c, r: r },
            e: { c: c + cs - 1, r: r + rs - 1 },
          });
        }
        c += cs;
        exCell.value = getValue(td);
        if (!opts.autoStyle) {
          let styles = getStylesDataAttr(td);
          const styleGroup = JSON.parse(JSON.stringify(styleRow));
          const styleGlobal = JSON.parse(JSON.stringify(styleTable));
          mergeObject(styleGlobal, styleGroup);
          mergeObject(styleGlobal, styles);
          exCell.font = styleGlobal.font || null;
          exCell.alignment = styleGlobal.alignment || null;
          exCell.border = styleGlobal.border || null;
          exCell.fill = styleGlobal.fill || null;
          exCell.numFmt = styleGlobal.numFmt || null;
        }
        // // If first row, set width of the columns.
        // if (_r == 0) {
        //   // ws.columns[_c].width = Math.round(tds[_c].offsetWidth / 7.2); // convert pixel to character width
        // }
      }
    }
    //Setting column width
    if (widths)
      widths.forEach((width, _i) => {
        ws.columns[_i].width = width;
      });
    applyMerges(ws, merges, opts);
    return ws;
  };

  /**
   * To apply merges on the sheet
   * @param {object} ws The worksheet object
   * @param {object[]} merges array of merges
   */
  let applyMerges = function (ws, merges, opts) {
    const { emptyRowTop } = { ...opts };
    merges.forEach((m) => {
      ws.mergeCells(
        getExcelColumnName(m.s.c) +
          (m.s.r + emptyRowTop) +
          ":" +
          getExcelColumnName(m.e.c) +
          (m.e.r + emptyRowTop)
      );
    });
  };

  /**
   * Convert HTML to plain text
   */
  let htmldecode = (function () {
    let entities = [
      ["nbsp", " "],
      ["middot", "·"],
      ["quot", '"'],
      ["apos", "'"],
      ["gt", ">"],
      ["lt", "<"],
      ["amp", "&"],
    ].map(function (x) {
      return [new RegExp("&" + x[0] + ";", "g"), x[1]];
    });
    return function htmldecode(str) {
      let o = str
        .trim()
        .replace(/\s+/g, " ")
        .replace(/<\s*[bB][rR]\s*\/?>/g, "\n")
        .replace(/<[^>]*>/g, "");
      for (let i = 0; i < entities.length; ++i)
        o = o.replace(entities[i][0], entities[i][1]);
      return o;
    };
  })();

  /**
   * Takes a positive integer and returns the corresponding column name.
   * @param {number} num  The positive integer to convert to a column name.
   * @return {string}  The column name.
   */
  let getExcelColumnName = function (num) {
    for (var ret = "", a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
      ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
    }
    return ret;
  };

  let getColumnAddress = function (col, row) {
    return getExcelColumnName(col) + row;
  };

  /**
   * Checks the data type specified and conerts the value to it.
   * @param {HTML entity} td
   */
  let getValue = function (td) {
    let dataType = td.getAttribute("data-t");
    let rawVal = htmldecode(td.innerHTML);
    if (dataType) {
      let val;
      switch (dataType) {
        case "n": //number
          val = Number(rawVal);
          break;
        case "d": //date
          let date = new Date(rawVal);
          // To fix the timezone issue
          val = new Date(
            Date.UTC(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
              date.getHours(),
              date.getMinutes(),
              date.getSeconds()
            )
          );
          break;
        case "b": //boolean
          val =
            rawVal.toLowerCase() === "true"
              ? true
              : rawVal.toLowerCase() === "false"
              ? false
              : Boolean(parseInt(rawVal));
          break;
        default:
          val = rawVal;
      }
      return val;
    } else if (td.getAttribute("data-hyperlink")) {
      return {
        text: rawVal,
        hyperlink: td.getAttribute("data-hyperlink"),
      };
    } else if (td.getAttribute("data-error")) {
      return { error: td.getAttribute("data-error") };
    }
    if (!dataType && !!rawVal && !isNaN(rawVal.replace(",", ""))) {
      // console.log(rawVal.replace(',', ''))
      rawVal = Number(rawVal.replace(",", ""));
    }
    return rawVal;
  };

  /**
   * Prepares the style object for a cell using the data attributes
   * @param {HTML entity} td
   */
  const getStylesDataAttr = function (td) {
    //Font attrs
    let font = {};
    if (td.getAttribute("data-f-name"))
      font.name = td.getAttribute("data-f-name");
    if (td.getAttribute("data-f-sz")) font.size = td.getAttribute("data-f-sz");
    if (td.getAttribute("data-f-color"))
      font.color = { argb: td.getAttribute("data-f-color") };
    if (td.getAttribute("data-f-bold") === "true") font.bold = true;
    if (td.getAttribute("data-f-italic") === "true") font.italic = true;
    if (td.getAttribute("data-f-underline") === "true") font.underline = true;
    if (td.getAttribute("data-f-strike") === "true") font.strike = true;

    // Alignment attrs
    let alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: false,
    };
    if (td.getAttribute("data-a-h"))
      alignment.horizontal = td.getAttribute("data-a-h");
    if (td.getAttribute("data-a-v"))
      alignment.vertical = td.getAttribute("data-a-v");
    if (td.getAttribute("data-a-wrap") === "true") alignment.wrapText = true;
    if (td.getAttribute("data-a-text-rotation"))
      alignment.textRotation = td.getAttribute("data-a-text-rotation");
    if (td.getAttribute("data-a-indent"))
      alignment.indent = td.getAttribute("data-a-indent");
    if (td.getAttribute("data-a-rtl") === "true")
      alignment.readingOrder = "rtl";

    // Border attrs
    let border = {
      top: {},
      left: {},
      bottom: {},
      right: {},
    };

    if (td.getAttribute("data-b-a-s")) {
      let style = td.getAttribute("data-b-a-s");
      border.top.style = style;
      border.left.style = style;
      border.bottom.style = style;
      border.right.style = style;
    }
    if (td.getAttribute("data-b-a-c")) {
      let color = { argb: td.getAttribute("data-b-a-c") };
      border.top.color = color;
      border.left.color = color;
      border.bottom.color = color;
      border.right.color = color;
    }
    if (td.getAttribute("data-b-t-s")) {
      border.top.style = td.getAttribute("data-b-t-s");
      if (td.getAttribute("data-b-t-c"))
        border.top.color = { argb: td.getAttribute("data-b-t-c") };
    }
    if (td.getAttribute("data-b-l-s")) {
      border.left.style = td.getAttribute("data-b-l-s");
      if (td.getAttribute("data-b-l-c"))
        border.left.color = { argb: td.getAttribute("data-b-t-c") };
    }
    if (td.getAttribute("data-b-b-s")) {
      border.bottom.style = td.getAttribute("data-b-b-s");
      if (td.getAttribute("data-b-b-c"))
        border.bottom.color = { argb: td.getAttribute("data-b-t-c") };
    }
    if (td.getAttribute("data-b-r-s")) {
      border.right.style = td.getAttribute("data-b-r-s");
      if (td.getAttribute("data-b-r-c"))
        border.right.color = { argb: td.getAttribute("data-b-t-c") };
    }

    //Fill
    let fill;
    if (td.getAttribute("data-fill-color")) {
      fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: td.getAttribute("data-fill-color") },
      };
    }
    //number format
    let numFmt;
    if (td.getAttribute("data-num-fmt"))
      numFmt = td.getAttribute("data-num-fmt");
    const result = {
      font,
      alignment,
      border,
      fill,
      numFmt,
    };
    return result;
  };

  let mergeObject = function (obj1, obj2) {
    for (let key in obj2) {
      if (obj1.hasOwnProperty(key)) {
        if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
          mergeObject(obj1[key], obj2[key]);
        } else if (obj2[key]) {
          obj1[key] = obj2[key];
        }
      } else if (obj2[key]) {
        obj1[key] = obj2[key];
      }
    }
  };
  return methods;
})();

export default TTEParser;
