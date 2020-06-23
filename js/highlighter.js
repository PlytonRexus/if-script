function handleScroll(e) {
    var scrollTop = document.querySelector("#input-area").scrollTop;
    document.querySelector(".backdrop").scrollTop = scrollTop;
}

function handleInput(e) {
    var text = e.target.value;
    var highlightedText = applyHighlights(text);
    // document.querySelector("#output-area").innerHTML = highlightedText;
}

function applyHighlights(text) {
    if (isIE) {
        // IE wraps whitespace differently in a div vs textarea, this fixes it
        text = text.replace(/ /g, ' <wbr>');
    }

    return text
        .replace(/\n$/g, '\n\n')
        // .replace(/[A-Z].*?\b/g, '<mark>$&</mark>');
}