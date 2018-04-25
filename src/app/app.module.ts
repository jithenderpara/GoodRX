import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HeaderComponent } from './common/header/header.component';
import { UploadcsvModule } from './core/uploadcsv/uploadcsv.module';
import { UploadComponent } from './core/upload/upload.component';


import { ReactiveFormsModule } from '@angular/forms';
import { SchedulejobComponent } from './core/schedulejob/schedulejob.component';

const Route = [
  { path: 'upload', component: UploadComponent },
  { path: 'job', component: SchedulejobComponent }
]
@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    UploadComponent,
    SchedulejobComponent
  ],
  imports: [
    BrowserModule,
    UploadcsvModule,
    ReactiveFormsModule,
    RouterModule.forRoot(Route)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
