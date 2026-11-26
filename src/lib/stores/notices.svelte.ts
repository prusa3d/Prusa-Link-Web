/// Things the printer refused, shown under the printer header for a while
/// or until the person closes them: what was asked, and what the printer said.

export interface Notice {
  id: number;
  title: string;
  detail?: string | undefined;
  /// How long it stays.
  seconds: number;
}

class Notices {
  #list = $state<Notice[]>([]);
  #next = 1;

  get list(): readonly Notice[] {
    return this.#list;
  }

  /// Shows a notice for `seconds`, then closes it.
  add(title: string, detail?: string, seconds = 20) {
    const id = this.#next++;
    this.#list = [...this.#list, { id, title, detail, seconds }];
    setTimeout(() => {
      this.dismiss(id);
    }, seconds * 1000);
  }

  dismiss(id: number) {
    this.#list = this.#list.filter((n) => n.id !== id);
  }
}

export const notices = new Notices();
