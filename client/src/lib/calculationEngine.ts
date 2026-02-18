import { HyperFormula } from 'hyperformula';

export interface CalculationContext {
  [key: string]: number | string;
}

export interface CalculationResult {
  value: number | string | null;
  error?: string;
}

export interface SheetData {
  name: string;
  data: (string | number | null)[][];
}

export interface NamedVariable {
  name: string;
  expression: string;
}

export interface FormulaTrace {
  formula: string;
  inputs: Record<string, number | string>;
  output: number | string | null;
}

export interface ScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  results: Record<string, number | string | null>;
}

export interface ScenarioDiff {
  field: string;
  baseValue: number | string | null;
  scenarioValue: number | string | null;
  delta: number | null;
  deltaPercent: number | null;
}

class CalculationEngine {
  private hf: HyperFormula;
  private sheetId: number;
  private sheetMap: Map<string, number> = new Map();
  private namedVariables: Map<string, string> = new Map();
  private formulaTraces: Map<string, FormulaTrace> = new Map();

  constructor() {
    this.hf = HyperFormula.buildEmpty({
      licenseKey: 'gpl-v3',
      precisionRounding: 10,
      useArrayArithmetic: true,
    });
    const sheetName = this.hf.addSheet('main');
    this.sheetId = this.hf.getSheetId(sheetName) ?? 0;
    this.sheetMap.set('main', this.sheetId);
  }

  static create(): CalculationEngine {
    return new CalculationEngine();
  }

  static fromData(data: (string | number | null)[][]): CalculationEngine {
    const engine = new CalculationEngine();
    engine.setSheetData(data);
    return engine;
  }

  // ============================================================================
  // Multi-sheet support
  // ============================================================================

  addSheet(name: string, data?: (string | number | null)[][]): number {
    const existingId = this.sheetMap.get(name);
    if (existingId !== undefined) {
      if (data) {
        this.setSheetDataById(existingId, data);
      }
      return existingId;
    }

    const sheetName = this.hf.addSheet(name);
    const sheetId = this.hf.getSheetId(sheetName) ?? 0;
    this.sheetMap.set(name, sheetId);
    if (data) {
      this.setSheetDataById(sheetId, data);
    }
    return sheetId;
  }

  getSheetId(name: string): number | undefined {
    return this.sheetMap.get(name);
  }

  switchSheet(name: string): boolean {
    const id = this.sheetMap.get(name);
    if (id !== undefined) {
      this.sheetId = id;
      return true;
    }
    return false;
  }

  getActiveSheetName(): string {
    const entries = Array.from(this.sheetMap.entries());
    for (const [name, id] of entries) {
      if (id === this.sheetId) return name;
    }
    return 'main';
  }

  listSheets(): string[] {
    return Array.from(this.sheetMap.keys());
  }

  removeSheet(name: string): boolean {
    if (name === 'main') return false;
    const id = this.sheetMap.get(name);
    if (id === undefined) return false;
    try {
      this.hf.removeSheet(id);
      this.sheetMap.delete(name);
      if (this.sheetId === id) {
        this.sheetId = this.sheetMap.get('main') ?? 0;
      }
      return true;
    } catch {
      return false;
    }
  }

  private setSheetDataById(sheetId: number, data: (string | number | null)[][]): void {
    const processedData = data.map(row =>
      row.map(cell => {
        if (cell === null) return null;
        if (typeof cell === 'number') return cell;
        if (typeof cell === 'string' && cell.startsWith('=')) return cell;
        const num = Number(cell);
        return !isNaN(num) && cell.trim() !== '' ? num : cell;
      })
    );
    this.hf.setCellContents({ sheet: sheetId, row: 0, col: 0 }, processedData);
  }

  // ============================================================================
  // Scenario support
  // ============================================================================

  createScenarioSheet(scenarioName: string, baseAssumptions: Record<string, number>, overrides: Record<string, number>): number {
    const merged = { ...baseAssumptions, ...overrides };
    const data: (string | number | null)[][] = [
      ['Variable', 'Value'],
    ];
    for (const [key, value] of Object.entries(merged)) {
      data.push([key, value]);
    }
    return this.addSheet(`scenario_${scenarioName}`, data);
  }

  recalculate(changedAssumptions: Record<string, number>): Record<string, CalculationResult> {
    // Apply changed values as named expressions
    for (const [name, value] of Object.entries(changedAssumptions)) {
      const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      try {
        this.hf.changeNamedExpression(sanitizedName, String(value), this.sheetId);
      } catch {
        this.addNamedExpression(sanitizedName, String(value));
      }
    }

    // Read back all named variables and their current values
    const results: Record<string, CalculationResult> = {};
    const varEntries = Array.from(this.namedVariables.entries());
    for (const [name] of varEntries) {
      try {
        const value = this.hf.calculateFormula(`=${name}`, this.sheetId);
        if (value instanceof Object && 'type' in value) {
          results[name] = { value: null, error: `Formula error: ${(value as any).type}` };
        } else {
          results[name] = { value: value as number | string | null };
        }
      } catch (e) {
        results[name] = { value: null, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }
    return results;
  }

  compareScenarios(baseSheet: string, scenarioSheets: string[], fields: string[]): ScenarioDiff[][] {
    const baseId = this.sheetMap.get(baseSheet);
    if (baseId === undefined) return [];

    const results: ScenarioDiff[][] = [];

    for (const scenarioName of scenarioSheets) {
      const scenarioId = this.sheetMap.get(scenarioName);
      if (scenarioId === undefined) continue;

      const diffs: ScenarioDiff[] = [];
      for (let i = 0; i < fields.length; i++) {
        const baseVal = this.hf.getCellValue({ sheet: baseId, row: i + 1, col: 1 });
        const scenarioVal = this.hf.getCellValue({ sheet: scenarioId, row: i + 1, col: 1 });

        const baseNum = typeof baseVal === 'number' ? baseVal : null;
        const scenarioNum = typeof scenarioVal === 'number' ? scenarioVal : null;

        diffs.push({
          field: fields[i],
          baseValue: baseVal as number | string | null,
          scenarioValue: scenarioVal as number | string | null,
          delta: baseNum !== null && scenarioNum !== null ? scenarioNum - baseNum : null,
          deltaPercent: baseNum !== null && scenarioNum !== null && baseNum !== 0
            ? ((scenarioNum - baseNum) / baseNum) * 100
            : null,
        });
      }
      results.push(diffs);
    }

    return results;
  }

  // ============================================================================
  // Formula audit trail
  // ============================================================================

  evaluateWithTrace(formula: string, inputs: Record<string, number | string>): FormulaTrace {
    const result = this.evaluateWithContext(formula, inputs);
    const trace: FormulaTrace = {
      formula,
      inputs,
      output: result.value,
    };
    const traceKey = `${formula}_${JSON.stringify(inputs)}`;
    this.formulaTraces.set(traceKey, trace);
    return trace;
  }

  getFormulaTraces(): FormulaTrace[] {
    return Array.from(this.formulaTraces.values());
  }

  clearTraces(): void {
    this.formulaTraces.clear();
  }

  // ============================================================================
  // Original single-sheet methods (preserved for backward compatibility)
  // ============================================================================

  setSheetData(data: (string | number | null)[][]): void {
    this.setSheetDataById(this.sheetId, data);
  }

  setCell(row: number, col: number, value: string | number | null): void {
    let cellValue: string | number | null = value;
    if (typeof value === 'string' && !value.startsWith('=')) {
      const num = Number(value);
      if (!isNaN(num) && value.trim() !== '') {
        cellValue = num;
      }
    }
    this.hf.setCellContents({ sheet: this.sheetId, row, col }, [[cellValue]]);
  }

  getCell(row: number, col: number): CalculationResult {
    try {
      const value = this.hf.getCellValue({ sheet: this.sheetId, row, col });
      if (value instanceof Object && 'type' in value) {
        return { value: null, error: `Formula error: ${value.type}` };
      }
      return { value: value as number | string | null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  getCellFormula(row: number, col: number): string | null {
    try {
      return this.hf.getCellFormula({ sheet: this.sheetId, row, col }) ?? null;
    } catch {
      return null;
    }
  }

  addNamedExpression(name: string, expression: string): void {
    try {
      this.hf.addNamedExpression(name, expression, this.sheetId);
      this.namedVariables.set(name, expression);
    } catch (e) {
      console.warn(`Failed to add named expression ${name}:`, e);
    }
  }

  removeNamedExpression(name: string): void {
    try {
      this.hf.removeNamedExpression(name, this.sheetId);
      this.namedVariables.delete(name);
    } catch (e) {
      console.warn(`Failed to remove named expression ${name}:`, e);
    }
  }

  evaluateFormula(formula: string): CalculationResult {
    try {
      const tempRow = 9999;
      const tempCol = 0;

      const formulaStr = formula.startsWith('=') ? formula : `=${formula}`;
      this.hf.setCellContents({ sheet: this.sheetId, row: tempRow, col: tempCol }, [[formulaStr]]);

      const result = this.hf.getCellValue({ sheet: this.sheetId, row: tempRow, col: tempCol });

      this.hf.setCellContents({ sheet: this.sheetId, row: tempRow, col: tempCol }, [[null]]);

      if (result instanceof Object && 'type' in result) {
        return { value: null, error: `Formula error: ${result.type}` };
      }

      return { value: result as number | string | null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Evaluation failed' };
    }
  }

  evaluateWithContext(formula: string, context: CalculationContext): CalculationResult {
    let processedFormula = formula.startsWith('=') ? formula.slice(1) : formula;

    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const value = context[key];
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processedFormula = processedFormula.replace(regex, String(value));
    }

    return this.evaluateFormula(processedFormula);
  }

  sum(range: string): CalculationResult {
    return this.evaluateFormula(`=SUM(${range})`);
  }

  average(range: string): CalculationResult {
    return this.evaluateFormula(`=AVERAGE(${range})`);
  }

  calculateNPV(rate: number, cashFlows: number[]): CalculationResult {
    const cashFlowStr = cashFlows.join(',');
    return this.evaluateFormula(`=NPV(${rate}, ${cashFlowStr})`);
  }

  calculatePMT(rate: number, periods: number, presentValue: number): CalculationResult {
    return this.evaluateFormula(`=PMT(${rate}, ${periods}, ${-presentValue})`);
  }

  calculateIRR(cashFlows: number[]): CalculationResult {
    for (let i = 0; i < cashFlows.length; i++) {
      this.setCell(0, i, cashFlows[i]);
    }
    const lastCol = String.fromCharCode(65 + cashFlows.length - 1);
    return this.evaluateFormula(`=IRR(A1:${lastCol}1)`);
  }

  calculateROI(gain: number, cost: number): CalculationResult {
    if (cost === 0) {
      return { value: null, error: 'Division by zero: cost cannot be zero' };
    }
    return this.evaluateFormula(`=((${gain}-${cost})/${cost})*100`);
  }

  calculatePaybackPeriod(investment: number, annualCashFlow: number): CalculationResult {
    if (annualCashFlow <= 0) {
      return { value: null, error: 'Annual cash flow must be positive' };
    }
    return this.evaluateFormula(`=${investment}/${annualCashFlow}`);
  }

  calculateCompoundGrowth(presentValue: number, rate: number, periods: number): CalculationResult {
    return this.evaluateFormula(`=${presentValue}*POWER(1+${rate},${periods})`);
  }

  ifCondition(condition: string, trueValue: string | number, falseValue: string | number): CalculationResult {
    const trueStr = typeof trueValue === 'string' ? `"${trueValue}"` : trueValue;
    const falseStr = typeof falseValue === 'string' ? `"${falseValue}"` : falseValue;
    return this.evaluateFormula(`=IF(${condition},${trueStr},${falseStr})`);
  }

  roundValue(value: number, decimals: number = 2): CalculationResult {
    return this.evaluateFormula(`=ROUND(${value},${decimals})`);
  }

  percentOf(value: number, percentage: number): CalculationResult {
    return this.evaluateFormula(`=${value}*${percentage}/100`);
  }

  getAllSheetValues(): (number | string | null)[][] {
    try {
      const values = this.hf.getSheetValues(this.sheetId);
      return values as (number | string | null)[][];
    } catch {
      return [];
    }
  }

  exportSheet(): string {
    return JSON.stringify({
      data: this.getAllSheetValues(),
      namedVariables: Array.from(this.namedVariables.entries()),
    });
  }

  exportAllSheets(): string {
    const sheets: Record<string, { data: (number | string | null)[][] }> = {};
    const sheetEntries = Array.from(this.sheetMap.entries());
    for (const [name, id] of sheetEntries) {
      try {
        const values = this.hf.getSheetValues(id);
        sheets[name] = { data: values as (number | string | null)[][] };
      } catch {
        sheets[name] = { data: [] };
      }
    }
    return JSON.stringify({
      sheets,
      namedVariables: Array.from(this.namedVariables.entries()),
      traces: Array.from(this.formulaTraces.values()),
    });
  }

  importSheet(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (parsed.data) {
        this.setSheetData(parsed.data);
      }
      if (parsed.namedVariables) {
        for (const [name, expr] of parsed.namedVariables) {
          this.addNamedExpression(name, expr as string);
        }
      }
    } catch (e) {
      console.error('Failed to import sheet:', e);
    }
  }

  destroy(): void {
    this.hf.destroy();
  }
}

export function createCalculationEngine(): CalculationEngine {
  return CalculationEngine.create();
}

export function createEngineFromData(data: (string | number | null)[][]): CalculationEngine {
  return CalculationEngine.fromData(data);
}

export function quickCalculate(formula: string, context?: CalculationContext): CalculationResult {
  const engine = createCalculationEngine();
  try {
    if (context) {
      return engine.evaluateWithContext(formula, context);
    }
    return engine.evaluateFormula(formula);
  } finally {
    engine.destroy();
  }
}

export function calculateBenefitTotals(benefits: Array<{
  revenue?: number;
  cost?: number;
  cashFlow?: number;
  risk?: number;
}>): { total: number; byCategory: Record<string, number> } {
  const engine = createCalculationEngine();

  try {
    const data: (string | number | null)[][] = [
      ['Revenue', 'Cost', 'CashFlow', 'Risk', 'Total'],
    ];

    for (let i = 0; i < benefits.length; i++) {
      const b = benefits[i];
      const row = i + 1;
      data.push([
        b.revenue || 0,
        b.cost || 0,
        b.cashFlow || 0,
        b.risk || 0,
        `=SUM(A${row + 1}:D${row + 1})`,
      ]);
    }

    const lastRow = benefits.length + 1;
    data.push([
      `=SUM(A2:A${lastRow})`,
      `=SUM(B2:B${lastRow})`,
      `=SUM(C2:C${lastRow})`,
      `=SUM(D2:D${lastRow})`,
      `=SUM(E2:E${lastRow})`,
    ]);

    engine.setSheetData(data);

    const totalRow = benefits.length + 1;
    const revenueTotal = engine.getCell(totalRow, 0).value as number || 0;
    const costTotal = engine.getCell(totalRow, 1).value as number || 0;
    const cashFlowTotal = engine.getCell(totalRow, 2).value as number || 0;
    const riskTotal = engine.getCell(totalRow, 3).value as number || 0;
    const grandTotal = engine.getCell(totalRow, 4).value as number || 0;

    return {
      total: grandTotal,
      byCategory: {
        revenue: revenueTotal,
        cost: costTotal,
        cashFlow: cashFlowTotal,
        risk: riskTotal,
      },
    };
  } finally {
    engine.destroy();
  }
}

export function calculatePriorityScore(
  valueScore: number,
  ttvScore: number,
  effortScore: number,
  weights: { value: number; ttv: number; effort: number } = { value: 40, ttv: 30, effort: 30 }
): number {
  const engine = createCalculationEngine();

  try {
    const formula = `=(${valueScore}*${weights.value}+${ttvScore}*${weights.ttv}+(100-${effortScore})*${weights.effort})/100`;
    const result = engine.evaluateFormula(formula);
    return typeof result.value === 'number' ? result.value : 0;
  } finally {
    engine.destroy();
  }
}

export function calculateTokenCosts(params: {
  inputTokens: number;
  outputTokens: number;
  runsPerMonth: number;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
  cachingEffectiveness?: number;
  cachingDiscount?: number;
}): { monthly: number; annual: number; perRun: number } {
  const {
    inputTokens,
    outputTokens,
    runsPerMonth,
    inputCostPerMillion = 3.00,
    outputCostPerMillion = 15.00,
    cachingEffectiveness = 0,
    cachingDiscount = 90,
  } = params;

  const engine = createCalculationEngine();

  try {
    const inputCostPerToken = inputCostPerMillion / 1000000;
    const outputCostPerToken = outputCostPerMillion / 1000000;

    const effectiveCacheRate = cachingEffectiveness / 100;
    const cacheDiscountRate = cachingDiscount / 100;

    const cachedInputCost = inputTokens * inputCostPerToken * effectiveCacheRate * (1 - cacheDiscountRate);
    const uncachedInputCost = inputTokens * inputCostPerToken * (1 - effectiveCacheRate);
    const totalInputCost = cachedInputCost + uncachedInputCost;

    const outputCost = outputTokens * outputCostPerToken;

    const perRunCost = totalInputCost + outputCost;
    const monthlyCost = perRunCost * runsPerMonth;
    const annualCost = monthlyCost * 12;

    return {
      monthly: Math.round(monthlyCost * 100) / 100,
      annual: Math.round(annualCost * 100) / 100,
      perRun: Math.round(perRunCost * 10000) / 10000,
    };
  } finally {
    engine.destroy();
  }
}

export { CalculationEngine };
