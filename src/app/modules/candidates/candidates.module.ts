import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CandidatesRoutingModule } from './candidates-routing.module';
import { CandidateListComponent } from './candidate-list/candidate-list.component';
import { SharedModule } from '../../shared/shared.module';


@NgModule({
  declarations: [CandidateListComponent],
  imports: [
    CommonModule,
    CandidatesRoutingModule,
    SharedModule
  ]
})
export class CandidatesModule { }
