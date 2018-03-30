import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import {UploadcsvComponent} from './uploadcsv.component'
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
@NgModule({
  imports: [
    CommonModule,
    NgxDatatableModule
  ],
  declarations: [UploadcsvComponent],
  exports:[UploadcsvComponent]
})
export class UploadcsvModule { }
