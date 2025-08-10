const { redefine_getter } = ChromeUtils.importESModule("chrome://glide/content/utils/objects.mjs");
const IPC = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");

// defined in the content process so we can access internal helpers
declare var $internal_glide: {
  deserialise_glidefunction: (source: string) => (...args: any[]) => void;
  send_message: (id: number, name: string) => void;
};

export class Messenger<Messages extends Record<string, any>> implements glide.ParentMessenger<Messages> {
  #id: number;
  #receiver: (message: glide.Message<Messages>) => void;

  constructor(id: number, receiver: (message: glide.Message<Messages>) => void) {
    this.#id = id;
    this.#receiver = receiver;
  }

  get content(): glide.ParentMessenger<Messages>["content"] {
    const messenger = this;
    return redefine_getter(this, "content", {
      execute(callback, opts) {
        GlideBrowser.api.content.execute((id: number, callback: any) => {
          const messenger = {
            send: (name: string) => {
              $internal_glide.send_message(id, name);
            },
          };

          const func = $internal_glide.deserialise_glidefunction(callback);
          func(messenger);
        }, { ...opts, args: [messenger.#id, IPC.serialize_function_to_expression(callback)] });
      },
    });
  }

  _recv(message: glide.Message<Messages>): void {
    this.#receiver(message);
  }
}
