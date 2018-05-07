import { Component, OnInit, AfterContentChecked, AfterContentInit } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';

import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/toPromise';
@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit, AfterContentChecked, AfterContentInit {
  uploadForm: FormGroup;
  constructor(private fb: FormBuilder,private http: Http) { }
filesToUpload: Array<File> = [];

upload() {
    const formData: any = new FormData();
    const files: Array<File> = this.filesToUpload;
    console.log(files);

    for(let i =0; i < files.length; i++){
        formData.append("uploads[]", files[i], files[i]['name']);
    }
    console.log('form data variable :   '+ formData.toString());
    this.http.post('http://localhost:145/upload', formData)
        .map(files => files.json())
        .subscribe(files => console.log('files', files))
}

fileChangeEvent(fileInput: any) {
    this.filesToUpload = <Array<File>>fileInput.target.files;
    //this.product.photo = fileInput.target.files[0]['name'];
}


  ngOnInit() {
    this.uploadForm = this.fb.group({
      excelfile: ['', Validators.required]
    });
  }
// fileChange(event) {
//     let fileList: FileList = event.target.files;
//     if(fileList.length > 0) {
//         let file: File = fileList[0];
//         let formData:FormData = new FormData();
//         formData.append('uploadFile', file, file.name);
//         let headers = new Headers();
//         /** In Angular 5, including the header Content-Type can invalidate your request */
//         headers.append('Content-Type', '');
//         //headers.append('Accept', 'application/json');
//         let options = new RequestOptions({ headers: headers });
//         this.http.post('uploadFile', formData, options)
//             .map(res => res.json())
//             .catch(error => Observable.throw(error))
//             .subscribe(
//                 data => console.log('success'),
//                 error => console.log(error)
//             )
//     }
// }
  
  ngAfterContentInit() {
    //
  }
  ngAfterContentChecked() {
    //
  }

}
