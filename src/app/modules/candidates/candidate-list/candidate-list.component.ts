import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounce, debounceTime } from 'rxjs';
import { LoadingService } from '../../../shared/loading.service';
import { TableToExcel } from '../../../shared/lib/tableToExcel';
interface Candidate {
  id: string;
  full_name: string;
  day_of_birth: string;
  phone_number: string;
  email: string;
  address: string;
  education: string;
  position_candidate: string;
  experience: string;
  summary: string;
  department_apply: string;
  position_apply: string;
  date_apply: string;
  date_interview: string;
  result_interview: string;
  time_probation: number;
  date_official: string;
  note: string;
  lastModified: string;
  filePath: string;
}

@Component({
  selector: 'app-candidate-list',
  templateUrl: './candidate-list.component.html',
  styleUrl: './candidate-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateListComponent implements OnInit {
  @ViewChild('table', { static: true }) table!: ElementRef;
  readonly FORM_FIELDS = {
    keyword: 'keyword',
    sortBy: 'sortBy',
    pageIndex: 'pageIndex',
    id: 'id',
    full_name: 'full_name',
    day_of_birth: 'day_of_birth',
    phone_number: 'phone_number',
    email: 'email',
    address: 'address',
    education: 'education',
    position_candidate: 'position_candidate',
    experience: 'experience',
    summary: 'summary',
    department_apply: 'department_apply',
    position_apply: 'position_apply',
    date_apply: 'date_apply',
    date_interview: 'date_interview',
    result_interview: 'result_interview',
    time_probation: 'time_probation',
    date_official: 'date_official',
    note: 'note',
    pageSize: 'pageSize',
  };
  candidates: Candidate[] = [];
  candidateActive: Candidate | undefined;
  formGroup: FormGroup;
  formGroupItem: FormGroup;
  formBuilder: FormBuilder;
  isDragging: boolean = false;
  colsWidth: string = [10, ...Array.from(new Array(20)).map(() => 40)].join(
    ', '
  );
  constructor(
    private cdr: ChangeDetectorRef,
    private loadingService: LoadingService
  ) {
    this.formBuilder = inject(FormBuilder);
    this.formGroup = this.formBuilder.group({
      [this.FORM_FIELDS.keyword]: '',
      [this.FORM_FIELDS.sortBy]: '',
      [this.FORM_FIELDS.pageIndex]: 1,
      [this.FORM_FIELDS.pageSize]: 30,
    });
    this.formGroupItem = this.formBuilder.group({
      [this.FORM_FIELDS.full_name]: '',
      [this.FORM_FIELDS.id]: '',
      [this.FORM_FIELDS.day_of_birth]: '',
      [this.FORM_FIELDS.phone_number]: '',
      [this.FORM_FIELDS.email]: '',
      [this.FORM_FIELDS.address]: '',
      [this.FORM_FIELDS.education]: '',
      [this.FORM_FIELDS.position_candidate]: '',
      [this.FORM_FIELDS.experience]: '',
      [this.FORM_FIELDS.summary]: '',
      [this.FORM_FIELDS.department_apply]: '',
      [this.FORM_FIELDS.position_apply]: '',
      [this.FORM_FIELDS.date_apply]: '',
      [this.FORM_FIELDS.date_interview]: '',
      [this.FORM_FIELDS.result_interview]: '',
      [this.FORM_FIELDS.time_probation]: '',
      [this.FORM_FIELDS.date_official]: '',
      [this.FORM_FIELDS.note]: '',
    });
    this.formGroup.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        this.fetchCandidates();
      });
  }

  ngOnInit(): void {
    (window as any).electronAPI.receive('candidate-uploaded', (item: any) => {
      console.log('Candidates uploaded', item);
      this.fetchCandidates();
    });
    (window as any).electronAPI.receive(
      'candidates-response',
      (item: Candidate[]) => {
        this.candidates = item ?? [];
        console.log('Candidates response', this.candidates);

        this.cdr.detectChanges();
      }
    );
    this.fetchCandidates();
  }

  export(): void {
    const table =
      document.getElementById('candidate-list') ||
      document.createElement('div');
    
    const fieldName = 'Candidate_' + Date.now().toLocaleString() + '.xlsx';
    this.exportTableHtmlToExcel(table, fieldName, 'Sheet1', true);
  }

  exportTableHtmlToExcel(
    table: HTMLElement,
    fileName: string,
    sheetName: string,
    isHiddenLogo?: boolean
  ): void {
    const LOGO_ROW_EXCEL = 4;
    const common = new TableToExcel();
    const emptyRowTop = isHiddenLogo ? 0 : LOGO_ROW_EXCEL;
    common.convert(table, {
      name: fileName,
      sheet: {
        name: sheetName,
      },
      logo: isHiddenLogo
        ? {}
        : {
            // logo: LOGO_BASE64,
            // width: LOGO_W,
            // height: LOGO_H
          },
      emptyRowTop,
    });
  }

  fetchCandidates(): void {
    const keyword = this.formGroup.get(this.FORM_FIELDS.keyword)?.value;
    const sortBy = this.formGroup.get(this.FORM_FIELDS.sortBy)?.value;
    const pageIndex = this.formGroup.get(this.FORM_FIELDS.pageIndex)?.value;
    const pageSize = this.formGroup.get(this.FORM_FIELDS.pageSize)?.value;
    (window as any).electronAPI.loadCandidates({keyword, sortBy, pageIndex, pageSize});
  }

  onUpdate(candidate: Candidate): void {
    this.candidateActive = candidate;
    this.formGroupItem.patchValue(candidate);
    this.cdr.detectChanges();
  }

  onDelete(candidate: Candidate): void {
    (window as any).electronAPI.deleteCandidate(candidate.id);
    this.cdr.detectChanges();
  }

  onCancelUpdate(): void {
    this.candidateActive = undefined;
    this.formGroupItem.patchValue({});
    this.cdr.detectChanges();
  }

  onConfirmUpdate(): void {
    (window as any).electronAPI.updateCandidate(this.formGroupItem.value);
    this.candidateActive = undefined;
    this.formGroupItem.patchValue({});
    this.loadingService.activateLoading();
    this.cdr.detectChanges();
  }

  onViewCV(candidate: Candidate): void {
    (window as any).electronAPI.previewFile(candidate.filePath);
  }

  onPreviousPage(): void {
    const pageIndex = this.formGroup.get(this.FORM_FIELDS.pageIndex)?.value;
    if (pageIndex > 1) {
      this.formGroup.patchValue({
        [this.FORM_FIELDS.pageIndex]: pageIndex - 1,
      });
      this.fetchCandidates();
    }
  }

  onNextPage(): void {
    const pageIndex = this.formGroup.get(this.FORM_FIELDS.pageIndex)?.value;
    this.formGroup.patchValue({
      [this.FORM_FIELDS.pageIndex]: pageIndex + 1,
    });
    this.fetchCandidates();
  }

  async uploadCandidate(): Promise<void> {
    this.loadingService.activateLoading();
    await (window as any).electronAPI.uploadCV();
  }

  onMouseDown() {
    if (!this.table) {
      this.isDragging = false;
      return;
    }
    this.isDragging = true;
    const scrollableElement = this.table.nativeElement;

    scrollableElement.style.cursor = 'grabbing';

    const dragScroll = (moveEvent: MouseEvent) => {
      scrollableElement.scrollLeft -= moveEvent.movementX;
    };

    const stopDrag = () => {
      this.isDragging = false;
      scrollableElement.style.cursor = 'unset';
      scrollableElement.removeEventListener('mousemove', dragScroll);
      document.removeEventListener('mouseup', stopDrag);
    };

    scrollableElement.addEventListener('mousemove', dragScroll);
    document.addEventListener('mouseup', stopDrag);
  }
}
