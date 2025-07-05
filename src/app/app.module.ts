// Angular core modules
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";

// App routing module
import { AppRoutingModule } from "./app-routing.module";

// Root components
import { AppComponent } from "./app.component";

// Feature components
import { MainComponent } from "./pages/main/component";

// Services
import { HttpErrorHandler } from "./http-error-handler.service";
import { UtilsService } from "./services/utils.service";

// Third-party modules
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { SplitterModule } from 'primeng/splitter';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { SplitButtonModule } from 'primeng/splitbutton';
import { DynamicDialogModule, DialogService } from 'primeng/dynamicdialog';
import { DragulaModule } from 'ng2-dragula';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

@NgModule({
  // Angular and third-party modules used in the app
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    DragulaModule.forRoot(),
    CascadeSelectModule,
    SplitterModule,
    TooltipModule,
    MultiSelectModule,
    CodemirrorModule,
    SplitButtonModule,
    DynamicDialogModule
  ],
  // App components
  declarations: [
    AppComponent,
    MainComponent
  ],
  // Services and providers
  providers: [
    HttpErrorHandler,
    MainComponent,
    UtilsService,
    DialogService
  ],
  // Root component to bootstrap
  bootstrap: [AppComponent],
})
export class AppModule {}
