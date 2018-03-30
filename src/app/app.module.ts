import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HeaderComponent } from './common/header/header.component';
import { UploadcsvComponent } from './core/uploadcsv/uploadcsv.component';
const Route = [
  { path: 'upload', component: UploadcsvComponent }
]
@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    UploadcsvComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(Route)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
