import {Workbook} from 'exceljs';
import {saveAs} from 'file-saver';
const Parser = require('./parser');
export interface IOptionExcel{
  name?: string ;
  autoStyle?: boolean;
  sheet?: ISheet;
  // Vị trí bắt đầu ghi dữ liệu từ hàng + 1
  emptyRowTop?: number;
  logo?: ILogo;
}

export interface ISheet{
  name?: string;
}

export interface ILogo{
  logo?: string;
  width?: number;
  height?: number;
  extension?: string;
}
export class TableToExcel {

  initWorkBook = () => {
    return new Workbook();
  }

  initSheet = (wb: any, sheetName: string) => {
    return wb.addWorksheet(sheetName);
  }

  save = (wb: any, fileName: string) => {

    wb.xlsx.writeBuffer().then((buffer: any) => {
        saveAs(
          new Blob([buffer], {type: 'application/octet-stream'}),
          fileName
        );
      }
    )
    ;
  }

  tableToSheet = (wb: any, table: any, opts: IOptionExcel) => {
    let ws = this.initSheet(wb, opts?.sheet?.name || '');
    ws = Parser.parseDomToTable(ws, table, opts);
    if (!! opts.logo?.logo){
      const imageId = wb.addImage({
        base64: opts.logo.logo,
        extension: opts.logo.extension || 'png',
      });

      ws.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: opts.logo.width || 150, height: opts.logo.height || 50},
        editAs: 'oneCell',
      });
    }
    return wb;
  }

  tableToBook = (table: any, opts: any) => {
    let wb = this.initWorkBook();
    wb = this.tableToSheet(wb, table, opts);
    return wb;
  }

  convert = (table: any, opts: IOptionExcel = {}) => {
    const defaultOpts: any = {
      name: 'export.xlsx',
      autoStyle: false,
      sheet: {
        name: 'Sheet 1'
      },
      emptyRowTop: 0
    };
    opts = {...defaultOpts, ...opts};
    const wb = this.tableToBook(table, opts);
    this.save(wb, opts?.name || defaultOpts.name);
  }
}
