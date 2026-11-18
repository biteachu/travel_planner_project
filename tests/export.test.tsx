import {it,expect} from 'vitest';
import {exportGuidebook} from '../src/lib/export';
import {examples} from '../src/lib/examples';
it('HTML에 외부 코드나 위험 링크를 삽입하지 않는다',()=>{const t=structuredClone(examples[0]);t.title='<script>alert(1)</script>';t.sources=[{id:'evil',title:'evil',url:'javascript:alert(1)',provider:'웹',checkedAt:''}];const html=exportGuidebook(t);expect(html).not.toContain('<script>');expect(html).not.toContain('href="javascript:');expect(html).toContain('&lt;script&gt;');expect(html).toContain('<style>');expect(html).toContain('Content-Security-Policy')});
