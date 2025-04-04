import yt_dlp.yt_dlp as yt_dlp
import yt_dlp.yt_dlp.version as version

print(version.__version__, version.CHANNEL, version._pkg_version)
print(yt_dlp.utils.ytdl_is_updateable())
# yt_dlp.update.run_update(yt_dlp.YoutubeDL())
# print(version.__version__, version.CHANNEL, version._pkg_version)

#format: (line 1450 in readme)
base = {
    "live_from_start": True
}

class Bridge():
    ytdlp: yt_dlp.YoutubeDL
    process_func = lambda: 1

    def __init__(self, format, cookie_file):
        self.ytdlp = yt_dlp.YoutubeDL(base.update(
            {
                "format": format,
                "cookiefile": cookie_file,
                "process_hooks": [
                    self.process
                ]
            }
        ))
    
    def set_progress(this, func) -> None:
        this.process_func = func

    def process(this, param):
        this.process_func(param)

    def download(this, url):
        this.ytdlp.dl
        pass

