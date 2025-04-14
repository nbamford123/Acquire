export class Player {
  private _name: string;
  private _money: number;

  constructor(name: string, money: number) {
    this._name = name;
    this._money = money;
  }
  get name() {
    return this._name;
  }
  get money() {
    return this._money;
  }
}
