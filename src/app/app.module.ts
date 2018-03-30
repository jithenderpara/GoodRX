import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HeaderComponent } from './common/header/header.component';
import { UploadcsvModule } from './core/uploadcsv/uploadcsv.module';
import { UploadComponent } from './core/upload/upload.component';
const Route = [
  { path: 'upload', component: UploadComponent }
]
@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    UploadComponent
  ],
  imports: [
    BrowserModule,
    UploadcsvModule,
    RouterModule.forRoot(Route)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
