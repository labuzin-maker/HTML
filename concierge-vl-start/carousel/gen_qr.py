import qrcode
from qrcode.constants import ERROR_CORRECT_H

targets = [
    ("qr-start.png", "https://concierge-vl.ru/start"),
    ("qr-map.png", "https://concierge-vl.ru/map"),
]

for filename, url in targets:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=24,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2B211C", back_color="#FFFFFF").convert("RGB")
    img.save(filename)
    print(filename, url, img.size)
